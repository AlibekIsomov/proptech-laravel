<?php

namespace App\Console\Commands;

use App\Services\Telegram\TelegramBotApi;
use Illuminate\Console\Command;

class TelegramSetWebhook extends Command
{
    protected $signature = 'telegram:webhook {url? : Webhook URL (masalan https://domain.uz/telegram/webhook)} {--delete : Webhookni o\'chirish}';

    protected $description = "Aholi/Pudratchi bot uchun Telegram webhook'ni o'rnatish yoki o'chirish";

    public function handle(TelegramBotApi $api): int
    {
        if ($this->option('delete')) {
            $result = $api->deleteWebhook();
            $this->info('Webhook o\'chirildi: '.json_encode($result));

            return self::SUCCESS;
        }

        $url = $this->argument('url');

        if (! $url) {
            $this->error('Webhook URL kiriting, masalan: php artisan telegram:webhook https://domain.uz/telegram/webhook');

            return self::FAILURE;
        }

        $secret = config('services.telegram.webhook_secret');

        if (! $secret) {
            $this->error('TELEGRAM_WEBHOOK_SECRET .env faylida sozlanmagan.');

            return self::FAILURE;
        }

        $result = $api->setWebhook($url, $secret);

        if (! $result || ! ($result['ok'] ?? false)) {
            $this->error("Webhook o'rnatishda xato: ".json_encode($result));

            return self::FAILURE;
        }

        $this->info("✅ Webhook muvaffaqiyatli o'rnatildi: {$url}");

        return self::SUCCESS;
    }
}
