<?php

namespace App\Services\Telegram;

/**
 * Bot menyulari, klaviaturalari va o'zbekcha label'lar.
 */
class Keyboards
{
    public const CATEGORY_LABELS = [
        'plumbing'   => "🚰 Suv ta'minoti",
        'electrical' => '⚡ Elektr',
        'heating'    => '🔥 Isitish',
        'cleaning'   => '🧹 Tozalik',
        'elevator'   => '🛗 Lift',
        'appliance'  => '🔌 Maishiy texnika',
        'structural' => '🏗 Qurilish/konstruksiya',
        'other'      => '📦 Boshqa',
    ];

    public const PRIORITY_LABELS = [
        'low'       => '🟢 Past',
        'medium'    => "🟡 O'rta",
        'high'      => '🟠 Yuqori',
        'emergency' => '🔴 Favqulodda',
    ];

    public const STATUS_LABELS = [
        'open'        => '🆕 Yangi',
        'assigned'    => '👷 Biriktirildi',
        'in_progress' => '🔧 Bajarilmoqda',
        'completed'   => '✅ Bajarildi',
        'cancelled'   => '❌ Bekor qilindi',
    ];

    public static function categoryLabel(?string $value): string
    {
        return self::CATEGORY_LABELS[$value] ?? '📦 Boshqa';
    }

    public static function priorityLabel(?string $value): string
    {
        return self::PRIORITY_LABELS[$value] ?? self::PRIORITY_LABELS['medium'];
    }

    public static function statusLabel(?string $value): string
    {
        return self::STATUS_LABELS[$value] ?? $value;
    }

    /** /start bosilganda, ulanmagan foydalanuvchidan raqam so'rash. */
    public static function phoneRequestKeyboard(): array
    {
        return [
            'keyboard' => [
                [['text' => '📱 Raqamni ulashish', 'request_contact' => true]],
            ],
            'resize_keyboard' => true,
            'one_time_keyboard' => true,
        ];
    }

    /** Aholi uchun asosiy menyu (reply keyboard). */
    public static function residentMenu(bool $multipleApartments = false, bool $canSwitchToVendor = false): array
    {
        $rows = [
            ['📝 Yangi murojaat', '📋 Murojaatlarim'],
            ['🏠 Kvartiram'],
        ];

        if ($multipleApartments) {
            $rows[] = ['🔁 Kvartirani almashtirish'];
        }

        if ($canSwitchToVendor) {
            $rows[] = ['🔁 Pudratchi rejimi'];
        }

        $webAppRow = self::webAppRow();
        if ($webAppRow) {
            $rows[] = $webAppRow;
        }

        return [
            'keyboard' => $rows,
            'resize_keyboard' => true,
        ];
    }

    /** Pudratchi uchun asosiy menyu (reply keyboard). */
    public static function vendorMenu(bool $canSwitchToResident = false): array
    {
        $rows = [
            ['📋 Topshiriqlarim'],
        ];

        if ($canSwitchToResident) {
            $rows[] = ['🔁 Aholi rejimi'];
        }

        $webAppRow = self::webAppRow();
        if ($webAppRow) {
            $rows[] = $webAppRow;
        }

        return [
            'keyboard' => $rows,
            'resize_keyboard' => true,
        ];
    }

    protected static function webAppRow(): ?array
    {
        $url = config('services.telegram.webapp_url');

        if (! $url) {
            return null;
        }

        return [['text' => '🌐 Mini App', 'web_app' => ['url' => $url]]];
    }

    /** Murojaat kategoriyasini tanlash (inline keyboard). */
    public static function categoryInlineKeyboard(): array
    {
        $buttons = [];
        foreach (self::CATEGORY_LABELS as $value => $label) {
            $buttons[] = ['text' => $label, 'callback_data' => "cat:{$value}"];
        }

        return ['inline_keyboard' => array_chunk($buttons, 2)];
    }

    /** Murojaat ustuvorligini tanlash (inline keyboard). */
    public static function priorityInlineKeyboard(): array
    {
        $buttons = [];
        foreach (self::PRIORITY_LABELS as $value => $label) {
            $buttons[] = ['text' => $label, 'callback_data' => "pri:{$value}"];
        }

        return ['inline_keyboard' => array_chunk($buttons, 2)];
    }

    /** "O'tkazib yuborish" tugmasi (masalan, rasm yuklash bosqichi uchun). */
    public static function skipInlineKeyboard(string $callbackData): array
    {
        return [
            'inline_keyboard' => [
                [['text' => "⏭ O'tkazib yuborish", 'callback_data' => $callbackData]],
            ],
        ];
    }

    /** Pudratchi uchun: murojaat holatini o'zgartirish tugmalari. */
    public static function requestActionsKeyboard(string $requestId, string $currentStatus): array
    {
        $buttons = [];

        if ($currentStatus === 'assigned') {
            $buttons[] = ['text' => '▶️ Boshlash', 'callback_data' => "status:{$requestId}:in_progress"];
        } elseif ($currentStatus === 'in_progress') {
            $buttons[] = ['text' => '✅ Bajarildi', 'callback_data' => "status:{$requestId}:completed"];
        }

        if (empty($buttons)) {
            return ['inline_keyboard' => []];
        }

        return ['inline_keyboard' => [$buttons]];
    }

    /** Aholi: o'z kvartiralari orasida almashish (inline keyboard). */
    public static function apartmentSwitchKeyboard(array $residents): array
    {
        $buttons = [];

        foreach ($residents as $resident) {
            $apartment = $resident->apartment;
            $label = $apartment
                ? "🏠 {$apartment->number}-xonadon"
                : '🏠 Kvartira';

            $buttons[] = [['text' => $label, 'callback_data' => "apt:{$resident->id}"]];
        }

        return ['inline_keyboard' => $buttons];
    }
}
