<?php

namespace App\Console\Commands;

use App\Services\Telegram\TelegramBotApi;
use Illuminate\Console\Command;

class MahallaBotSetup extends Command
{
    protected $signature = 'mahalla:setup
        {url? : Webhook URL (masalan https://domain.uz/mahalla-fix/webhook)}
        {--delete : Webhookni o\'chirish}
        {--menu-text=Mahalla Fix : Menu tugmasi matni}';

    protected $description = "Mahalla Fix boti uchun webhook va Menu tugmasini sozlash";

    public function handle(): int
    {
        $api = TelegramBotApi::mahalla();

        if (! config('services.telegram.mahalla.bot_token')) {
            $this->error('TELEGRAM_MAHALLA_BOT_TOKEN .env faylida sozlanmagan.');

            return self::FAILURE;
        }

        if ($this->option('delete')) {
            $this->info('Webhook o\'chirildi: '.json_encode($api->deleteWebhook()));

            return self::SUCCESS;
        }

        $url = $this->argument('url');

        if (! $url) {
            $this->error('Webhook URL kiriting: php artisan mahalla:setup https://domain.uz/mahalla-fix/webhook');

            return self::FAILURE;
        }

        $secret = config('services.telegram.mahalla.webhook_secret');

        if (! $secret) {
            $this->error('TELEGRAM_MAHALLA_WEBHOOK_SECRET .env faylida sozlanmagan.');

            return self::FAILURE;
        }

        $webhook = $api->setWebhook($url, $secret);

        if (! $webhook || ! ($webhook['ok'] ?? false)) {
            $this->error("Webhook o'rnatishda xato: ".json_encode($webhook));

            return self::FAILURE;
        }

        $this->info("✅ Webhook o'rnatildi: {$url}");

        $webAppUrl = config('services.telegram.mahalla.webapp_url');

        if ($webAppUrl) {
            $menu = $api->setChatMenuButton($webAppUrl, (string) $this->option('menu-text'));

            if ($menu && ($menu['ok'] ?? false)) {
                $this->info("✅ Menu tugmasi o'rnatildi: {$webAppUrl}");
            } else {
                $this->warn('Menu tugmasini sozlashda xato: '.json_encode($menu));
            }
        } else {
            $this->warn('TELEGRAM_MAHALLA_WEBAPP_URL sozlanmagan — Menu tugmasi o\'tkazib yuborildi.');
        }

        return self::SUCCESS;
    }
}
