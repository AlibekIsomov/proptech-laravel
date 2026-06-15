<?php

namespace App\Services\Telegram;

use App\Models\TelegramSession;

/**
 * Telegram webhook'dan kelgan har bir update uchun yagona kirish nuqtasi.
 * Sessiya holatiga qarab ResidentFlow / VendorFlow / RegistrationService'ga yo'naltiradi.
 */
class UpdateHandler
{
    public function __construct(
        protected TelegramBotApi $api,
        protected RegistrationService $registration,
    ) {}

    public function process(array $update): void
    {
        if (isset($update['callback_query'])) {
            $this->handleCallbackQuery($update['callback_query']);
            return;
        }

        if (isset($update['message'])) {
            $this->handleMessage($update['message']);
        }
    }

    protected function handleMessage(array $message): void
    {
        $chat = $message['chat'] ?? null;

        if (! $chat || ! isset($chat['id'])) {
            return;
        }

        $chatId = (string) $chat['id'];
        $session = $this->findOrCreateSession($chatId, $message['from'] ?? []);

        if (isset($message['contact']['phone_number'])) {
            $this->handleContact($session, $message);
            return;
        }

        $text = $message['text'] ?? null;

        if ($text === '/start') {
            $this->handleStart($session);
            return;
        }

        if (! $session->isLinked()) {
            $this->promptPhone($session);
            return;
        }

        if (isset($message['photo']) && $session->state === 'new_request:photo' && $session->isResident()) {
            (new ResidentFlow($session, $this->api))->handlePhotoMessage($message['photo']);
            return;
        }

        if ($text !== null) {
            $this->handleText($session, $text);
        }
    }

    protected function handleContact(TelegramSession $session, array $message): void
    {
        $phone = $message['contact']['phone_number'];
        $from = $message['from'] ?? ['id' => $session->chat_id];

        $result = $this->registration->linkByPhone($session, $phone, $from);

        if (! $result['resident_found'] && ! $result['vendor_found']) {
            $this->api->sendMessage(
                $session->chat_id,
                "❌ Raqamingiz bizning bazamizda topilmadi.\n\nIltimos, mulkni boshqaruvchi (PM) kompaniyasiga murojaat qiling — sizning raqamingiz tizimga kiritilishi kerak.",
                ['remove_keyboard' => true]
            );
            return;
        }

        $this->api->sendMessage($session->chat_id, "✅ Muvaffaqiyatli ro'yxatdan o'tdingiz!", ['remove_keyboard' => true]);
        $this->sendMenuForActiveRole($session->fresh());
    }

    protected function handleStart(TelegramSession $session): void
    {
        if (! $session->isLinked()) {
            $this->promptPhone($session);
            return;
        }

        $this->sendMenuForActiveRole($session->fresh());
    }

    protected function promptPhone(TelegramSession $session): void
    {
        $this->api->sendMessage(
            $session->chat_id,
            "👋 Assalomu alaykum! Bu — 1Mahalla aholi/pudratchi botiga xush kelibsiz.\n\nDavom etish uchun telefon raqamingizni ulashing. Raqamingiz bizning tizimda ro'yxatdan o'tgan bo'lishi kerak.",
            Keyboards::phoneRequestKeyboard()
        );
    }

    protected function handleText(TelegramSession $session, string $text): void
    {
        switch ($text) {
            case '📝 Yangi murojaat':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->startNewRequest();
                }
                return;

            case '📋 Murojaatlarim':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->listMyRequests();
                } elseif ($session->isVendor()) {
                    (new VendorFlow($session, $this->api))->listAssignedRequests();
                }
                return;

            case '🏠 Kvartiram':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->showApartment();
                }
                return;

            case '📋 Topshiriqlarim':
                if ($session->isVendor()) {
                    (new VendorFlow($session, $this->api))->listAssignedRequests();
                }
                return;

            case '🔁 Kvartirani almashtirish':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->promptApartmentSwitch();
                }
                return;

            case '🔁 Pudratchi rejimi':
                if ($this->registration->switchRole($session, 'vendor')) {
                    $this->sendMenuForActiveRole($session->fresh());
                }
                return;

            case '🔁 Aholi rejimi':
                if ($this->registration->switchRole($session, 'resident')) {
                    $this->sendMenuForActiveRole($session->fresh());
                }
                return;
        }

        switch ($session->state) {
            case 'new_request:title':
                (new ResidentFlow($session, $this->api))->handleTitleInput($text);
                return;

            case 'new_request:description':
                (new ResidentFlow($session, $this->api))->handleDescriptionInput($text);
                return;

            default:
                $this->sendMenuForActiveRole($session);
        }
    }

    protected function handleCallbackQuery(array $callback): void
    {
        $callbackId = $callback['id'] ?? null;
        $message = $callback['message'] ?? null;
        $chat = $message['chat'] ?? null;
        $data = $callback['data'] ?? '';

        if (! $chat || ! isset($chat['id'])) {
            return;
        }

        $chatId = (string) $chat['id'];
        $session = $this->findOrCreateSession($chatId, $callback['from'] ?? []);

        if ($callbackId) {
            $this->api->answerCallbackQuery($callbackId);
        }

        if (! $session->isLinked()) {
            $this->promptPhone($session);
            return;
        }

        [$prefix, $rest] = array_pad(explode(':', $data, 2), 2, '');

        switch ($prefix) {
            case 'cat':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->handleCategoryCallback($rest);
                }
                return;

            case 'pri':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->handlePriorityCallback($rest);
                }
                return;

            case 'desc_skip':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->handleDescriptionSkip();
                }
                return;

            case 'photo_skip':
                if ($session->isResident()) {
                    (new ResidentFlow($session, $this->api))->handlePhotoSkip();
                }
                return;

            case 'apt':
                if ($session->isResident() && $this->registration->switchApartment($session, $rest)) {
                    (new ResidentFlow($session, $this->api))->showApartment();
                }
                return;

            case 'vreq':
                if ($session->isVendor()) {
                    (new VendorFlow($session, $this->api))->showRequest($rest);
                }
                return;

            case 'status':
                $this->handleStatusCallback($session, $rest);
        }
    }

    protected function handleStatusCallback(TelegramSession $session, string $rest): void
    {
        if (! $session->isVendor()) {
            return;
        }

        [$requestId, $newStatus] = array_pad(explode(':', $rest, 2), 2, null);

        if (! $requestId || ! $newStatus) {
            return;
        }

        (new VendorFlow($session, $this->api))->updateStatus($requestId, $newStatus);
    }

    protected function sendMenuForActiveRole(TelegramSession $session): void
    {
        if ($session->isVendor() && ! $session->isResident()) {
            (new VendorFlow($session, $this->api))->sendMenu();
            return;
        }

        if ($session->isResident()) {
            (new ResidentFlow($session, $this->api))->sendMenu();
            return;
        }

        $this->promptPhone($session);
    }

    protected function findOrCreateSession(string $chatId, array $from): TelegramSession
    {
        return TelegramSession::firstOrCreate(
            ['chat_id' => $chatId],
            [
                'telegram_user_id' => (string) ($from['id'] ?? $chatId),
                'telegram_username' => $from['username'] ?? null,
                'first_name' => $from['first_name'] ?? null,
                'last_name' => $from['last_name'] ?? null,
                'state' => 'idle',
            ]
        );
    }
}
