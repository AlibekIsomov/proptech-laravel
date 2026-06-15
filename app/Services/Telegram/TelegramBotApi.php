<?php

namespace App\Services\Telegram;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Aholi/Pudratchi bot uchun yengil Telegram Bot API wrapper.
 *
 * TELEGRAM_USER_BOT_TOKEN orqali ishlaydi (TelegramAlert/TELEGRAM_BOT_TOKEN dan alohida).
 */
class TelegramBotApi
{
    protected string $token;
    protected string $baseUrl;

    public function __construct()
    {
        $this->token = (string) config('services.telegram.user_bot_token');
        $this->baseUrl = "https://api.telegram.org/bot{$this->token}";
    }

    public function sendMessage(string|int $chatId, string $text, ?array $replyMarkup = null, string $parseMode = 'HTML'): ?array
    {
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => $parseMode,
        ];

        if ($replyMarkup !== null) {
            $payload['reply_markup'] = $replyMarkup;
        }

        return $this->call('sendMessage', $payload);
    }

    public function sendPhoto(string|int $chatId, string $photo, string $caption = '', ?array $replyMarkup = null): ?array
    {
        $payload = [
            'chat_id' => $chatId,
            'photo' => $photo,
            'caption' => $caption,
            'parse_mode' => 'HTML',
        ];

        if ($replyMarkup !== null) {
            $payload['reply_markup'] = $replyMarkup;
        }

        return $this->call('sendPhoto', $payload);
    }

    public function answerCallbackQuery(string $callbackQueryId, string $text = '', bool $alert = false): ?array
    {
        return $this->call('answerCallbackQuery', [
            'callback_query_id' => $callbackQueryId,
            'text' => $text,
            'show_alert' => $alert,
        ]);
    }

    public function editMessageReplyMarkup(string|int $chatId, int $messageId, ?array $replyMarkup = null): ?array
    {
        return $this->call('editMessageReplyMarkup', [
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'reply_markup' => $replyMarkup ?? ['inline_keyboard' => []],
        ]);
    }

    public function getFile(string $fileId): ?array
    {
        return $this->call('getFile', ['file_id' => $fileId]);
    }

    /** Telegram serveridan fayl baytlarini yuklab olish (file_path getFile() natijasidan). */
    public function downloadFile(string $filePath): ?string
    {
        if (! $this->token) {
            Log::warning('TelegramBotApi: TELEGRAM_USER_BOT_TOKEN sozlanmagan (downloadFile).');
            return null;
        }

        try {
            $response = Http::timeout(30)->get("https://api.telegram.org/file/bot{$this->token}/{$filePath}");

            if (! $response->successful()) {
                Log::error('TelegramBotApi: faylni yuklab olishda xato.', [
                    'status' => $response->status(),
                ]);
                return null;
            }

            return $response->body();
        } catch (\Throwable $e) {
            Log::error('TelegramBotApi: downloadFile - '.$e->getMessage());
            return null;
        }
    }

    /**
     * Botning doimiy "Menu" tugmasini Mini App ochadigan qilib o'rnatish
     * (barcha private chat'lar uchun, chat_id berilmasa).
     */
    public function setChatMenuButton(string $webAppUrl, string $text = 'Mini App'): ?array
    {
        return $this->call('setChatMenuButton', [
            'menu_button' => [
                'type' => 'web_app',
                'text' => $text,
                'web_app' => ['url' => $webAppUrl],
            ],
        ]);
    }

    public function setWebhook(string $url, string $secretToken): ?array
    {
        return $this->call('setWebhook', [
            'url' => $url,
            'secret_token' => $secretToken,
            'allowed_updates' => ['message', 'callback_query'],
        ]);
    }

    public function deleteWebhook(): ?array
    {
        return $this->call('deleteWebhook');
    }

    protected function call(string $method, array $payload = []): ?array
    {
        if (! $this->token) {
            Log::warning("TelegramBotApi: TELEGRAM_USER_BOT_TOKEN sozlanmagan ({$method}).");
            return null;
        }

        try {
            $response = Http::timeout(15)->post("{$this->baseUrl}/{$method}", $payload);

            if (! $response->successful()) {
                Log::error("TelegramBotApi: {$method} xato.", [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("TelegramBotApi: {$method} - ".$e->getMessage());
            return null;
        }
    }
}
