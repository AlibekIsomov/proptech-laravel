<?php

namespace App\Console\Commands;

use App\Services\Telegram\TelegramBotApi;
use Illuminate\Console\Command;

class TelegramSetMenuButton extends Command
{
    protected $signature = 'telegram:menu-button {--text=Mini App : Tugma matni}';

    protected $description = "Aholi/Pudratchi bot uchun doimiy Menu tugmasini Mini App'ga sozlash";

    public function handle(TelegramBotApi $api): int
    {
        $url = config('services.telegram.webapp_url');

        if (! $url) {
            $this->error('TELEGRAM_WEBAPP_URL .env faylida sozlanmagan.');

            return self::FAILURE;
        }

        $result = $api->setChatMenuButton($url, (string) $this->option('text'));

        if (! $result || ! ($result['ok'] ?? false)) {
            $this->error('Menu tugmasini sozlashda xato: '.json_encode($result));

            return self::FAILURE;
        }

        $this->info("✅ Menu tugmasi muvaffaqiyatli sozlandi: {$url}");

        return self::SUCCESS;
    }
}
