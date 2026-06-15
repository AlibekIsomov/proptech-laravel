<?php

namespace App\Services\Telegram;

use App\Models\MaintenancePhoto;
use App\Models\MaintenanceRequest;
use App\Models\Resident;
use App\Models\TelegramSession;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Aholi (resident) uchun bot suhbati: menyu, kvartira ma'lumoti,
 * yangi murojaat yaratish wizard'i va murojaatlar ro'yxati.
 */
class ResidentFlow
{
    public function __construct(
        protected TelegramSession $session,
        protected TelegramBotApi $api,
    ) {}

    protected function chatId(): string
    {
        return $this->session->chat_id;
    }

    protected function activeResident(): ?Resident
    {
        if (! $this->session->active_resident_id) {
            return null;
        }

        return Resident::with('apartment.building')->find($this->session->active_resident_id);
    }

    public function sendMenu(): void
    {
        $resident = $this->activeResident();

        if (! $resident) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. Iltimos /start ni qayta yuboring.');
            return;
        }

        $apartment = $resident->apartment;

        $text = "👋 Salom, <b>{$resident->full_name}</b>!\n";
        if ($apartment) {
            $text .= "🏠 Kvartira: №{$apartment->number}\n";
        }
        $text .= "\nQuyidagi menyudan birini tanlang 👇";

        $multiple = count($this->session->resident_ids ?? []) > 1;
        $canSwitchToVendor = $this->session->vendor_id !== null;

        $this->resetState();

        $this->api->sendMessage($this->chatId(), $text, Keyboards::residentMenu($multiple, $canSwitchToVendor));
    }

    public function showApartment(): void
    {
        $resident = $this->activeResident();
        $apartment = $resident?->apartment;

        if (! $resident || ! $apartment) {
            $this->api->sendMessage($this->chatId(), "Kvartira ma'lumotlari topilmadi.");
            return;
        }

        $building = $apartment->building;

        $lines = ["🏠 <b>Kvartira №{$apartment->number}</b>"];
        if ($building) {
            $lines[] = "🏢 Bino: {$building->name}";
        }
        if ($apartment->floor !== null) {
            $lines[] = "🔼 Qavat: {$apartment->floor}";
        }
        if ($apartment->rooms) {
            $lines[] = "🚪 Xonalar: {$apartment->rooms}";
        }
        if ($apartment->area) {
            $lines[] = "📐 Maydon: {$apartment->area} m²";
        }
        $lines[] = '';
        $lines[] = "👤 {$resident->full_name} (".self::residentTypeLabel($resident->resident_type).')';

        $this->api->sendMessage($this->chatId(), implode("\n", $lines));
    }

    public function promptApartmentSwitch(): void
    {
        $residents = $this->session->residents();

        if ($residents->count() < 2) {
            $this->showApartment();
            return;
        }

        $this->api->sendMessage(
            $this->chatId(),
            '🔁 Qaysi kvartira bilan ishlashni xohlaysiz?',
            Keyboards::apartmentSwitchKeyboard($residents->load('apartment')->all())
        );
    }

    public function listMyRequests(): void
    {
        $resident = $this->activeResident();

        if (! $resident) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. /start ni qayta yuboring.');
            return;
        }

        $requests = MaintenanceRequest::where('resident_id', $resident->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        if ($requests->isEmpty()) {
            $this->api->sendMessage($this->chatId(), "Sizda hali murojaatlar yo'q. \"📝 Yangi murojaat\" tugmasi orqali yarating.");
            return;
        }

        $lines = ['📋 <b>So\'nggi murojaatlaringiz:</b>', ''];

        foreach ($requests as $request) {
            $date = $request->created_at->format('d.m.Y');
            $lines[] = "<b>{$request->title}</b>";
            $lines[] = Keyboards::statusLabel($request->status)." · {$date}";
            $lines[] = '';
        }

        $this->api->sendMessage($this->chatId(), implode("\n", $lines));
    }

    // ── Yangi murojaat wizard ────────────────────────────────────────────

    public function startNewRequest(): void
    {
        if (! $this->activeResident()) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. /start ni qayta yuboring.');
            return;
        }

        $this->session->state = 'new_request:category';
        $this->session->context = [];
        $this->session->save();

        $this->api->sendMessage($this->chatId(), '📝 Murojaat turini tanlang:', Keyboards::categoryInlineKeyboard());
    }

    public function handleCategoryCallback(string $category): void
    {
        if (! array_key_exists($category, Keyboards::CATEGORY_LABELS)) {
            return;
        }

        $this->setContext('category', $category);
        $this->session->state = 'new_request:priority';
        $this->session->save();

        $this->api->sendMessage($this->chatId(), '⚠️ Muhimlik darajasini tanlang:', Keyboards::priorityInlineKeyboard());
    }

    public function handlePriorityCallback(string $priority): void
    {
        if (! array_key_exists($priority, Keyboards::PRIORITY_LABELS)) {
            return;
        }

        $this->setContext('priority', $priority);
        $this->session->state = 'new_request:title';
        $this->session->save();

        $this->api->sendMessage($this->chatId(), '✏️ Murojaat sarlavhasini qisqacha yozing (masalan: "Kranda suv oqayapti"):');
    }

    public function handleTitleInput(string $text): void
    {
        $title = trim($text);

        if ($title === '') {
            $this->api->sendMessage($this->chatId(), 'Iltimos, matn kiriting.');
            return;
        }

        $this->setContext('title', Str::limit($title, 150, ''));
        $this->session->state = 'new_request:description';
        $this->session->save();

        $this->api->sendMessage(
            $this->chatId(),
            "📄 Muammoni batafsil tasvirlab bering (yoki o'tkazib yuboring):",
            Keyboards::skipInlineKeyboard('desc_skip')
        );
    }

    public function handleDescriptionInput(string $text): void
    {
        $this->setContext('description', trim($text));
        $this->promptPhoto();
    }

    public function handleDescriptionSkip(): void
    {
        $this->setContext('description', '');
        $this->promptPhoto();
    }

    protected function promptPhoto(): void
    {
        $this->session->state = 'new_request:photo';
        $this->session->save();

        $this->api->sendMessage(
            $this->chatId(),
            "📷 Muammo rasmini yuborishingiz mumkin (yoki o'tkazib yuboring):",
            Keyboards::skipInlineKeyboard('photo_skip')
        );
    }

    public function handlePhotoSkip(): void
    {
        $this->finalizeRequest(null);
    }

    /** @param array<int, array{file_id:string}> $photoSizes Telegram message.photo array (eng kichigidan kattasigacha) */
    public function handlePhotoMessage(array $photoSizes): void
    {
        $largest = end($photoSizes);
        $fileId = $largest['file_id'] ?? null;
        $photoPath = null;

        if ($fileId) {
            $file = $this->api->getFile($fileId);
            $filePath = $file['result']['file_path'] ?? null;

            if ($filePath) {
                $contents = $this->api->downloadFile($filePath);

                if ($contents !== null) {
                    $extension = Str::afterLast($filePath, '.') ?: 'jpg';
                    $storedPath = 'maintenance/'.Str::uuid().'.'.$extension;
                    Storage::disk('public')->put($storedPath, $contents);
                    $photoPath = $storedPath;
                }
            }
        }

        $this->finalizeRequest($photoPath);
    }

    protected function finalizeRequest(?string $photoPath): void
    {
        $resident = $this->activeResident();

        if (! $resident || ! $resident->apartment) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. /start ni qayta yuboring.');
            $this->resetState();
            return;
        }

        $context = $this->session->context ?? [];

        $request = MaintenanceRequest::create([
            'apartment_id' => $resident->apartment_id,
            'building_id' => $resident->apartment->pm_building_id,
            'company_id' => $resident->company_id,
            'resident_id' => $resident->id,
            'category' => $context['category'] ?? 'other',
            'priority' => $context['priority'] ?? 'medium',
            'status' => 'open',
            'title' => $context['title'] ?? 'Murojaat',
            'description' => $context['description'] ?? '',
        ]);

        if ($photoPath) {
            MaintenancePhoto::create([
                'request_id' => $request->id,
                'photo_url' => Storage::url($photoPath),
                'photo_type' => 'before',
            ]);
        }

        $this->api->sendMessage(
            $this->chatId(),
            "✅ Murojaatingiz qabul qilindi!\n\n<b>{$request->title}</b>\n"
                .Keyboards::categoryLabel($request->category).' · '.Keyboards::priorityLabel($request->priority)
                ."\n\nHolatini \"📋 Murojaatlarim\" bo'limidan kuzatib borishingiz mumkin."
        );

        $this->sendMenu();
    }

    protected function setContext(string $key, mixed $value): void
    {
        $context = $this->session->context ?? [];
        $context[$key] = $value;
        $this->session->context = $context;
        $this->session->save();
    }

    protected function resetState(): void
    {
        $this->session->state = 'idle';
        $this->session->context = null;
        $this->session->save();
    }

    public static function residentTypeLabel(string $type): string
    {
        return match ($type) {
            'owner' => 'Mulkdor',
            'tenant' => 'Ijarachi',
            'family' => "Oila a'zosi",
            default => $type,
        };
    }
}
