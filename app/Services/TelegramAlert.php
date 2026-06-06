<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramAlert
{
    /**
     * Telegram Bot ga xabar yuborish.
     */
    public static function send(string $message): bool
    {
        $token  = config('services.telegram.bot_token');
        $chatId = config('services.telegram.chat_id');

        if (! $token || ! $chatId) {
            Log::warning('TelegramAlert: TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan.');
            return false;
        }

        try {
            $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id'    => $chatId,
                'text'       => $message,
                'parse_mode' => 'HTML',
            ]);

            if (! $response->successful()) {
                Log::error('TelegramAlert: Xabar yuborishda xato.', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('TelegramAlert: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * ❌ Xato xabar (qizil rangli)
     */
    public static function error(string $title, string $detail = ''): bool
    {
        $env  = config('app.env', 'production');
        $host = config('app.url', 'unknown');
        $time = now()->format('d.m.Y H:i:s');

        $text = "❌ <b>{$title}</b>\n\n"
            . ($detail ? "📋 <code>{$detail}</code>\n\n" : '')
            . "🌍 <b>Muhit:</b> {$env}\n"
            . "🔗 <b>Server:</b> {$host}\n"
            . "🕐 <b>Vaqt:</b> {$time}";

        return static::send($text);
    }

    /**
     * ✅ Muvaffaqiyat xabar (yashil rangli)
     */
    public static function success(string $title, string $detail = ''): bool
    {
        $time = now()->format('d.m.Y H:i:s');

        $text = "✅ <b>{$title}</b>\n\n"
            . ($detail ? "{$detail}\n\n" : '')
            . "🕐 <b>Vaqt:</b> {$time}";

        return static::send($text);
    }

    /**
     * ⚠️ Ogohlantirish xabar
     */
    public static function warning(string $title, string $detail = ''): bool
    {
        $time = now()->format('d.m.Y H:i:s');

        $text = "⚠️ <b>{$title}</b>\n\n"
            . ($detail ? "{$detail}\n\n" : '')
            . "🕐 <b>Vaqt:</b> {$time}";

        return static::send($text);
    }
}
