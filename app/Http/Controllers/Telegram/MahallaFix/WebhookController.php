<?php

namespace App\Http\Controllers\Telegram\MahallaFix;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramBotApi;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Mahalla Fix boti uchun webhook. Aholi/Pudratchi botining webhook'idan alohida —
 * o'z sekretiga ega. MVP: /start ga javob berib, Mini App'ni ochadigan tugma yuboradi.
 */
class WebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $secret = config('services.telegram.mahalla.webhook_secret');

        if ($secret && $request->header('X-Telegram-Bot-Api-Secret-Token') !== $secret) {
            return response('Forbidden', 403);
        }

        try {
            $this->process((array) $request->json()->all());
        } catch (\Throwable $e) {
            report($e);
        }

        return response('OK', 200);
    }

    protected function process(array $update): void
    {
        $message = $update['message'] ?? null;

        if (! $message || ! isset($message['chat']['id'])) {
            return;
        }

        $chatId = $message['chat']['id'];
        $text = trim((string) ($message['text'] ?? ''));

        if (! str_starts_with($text, '/start')) {
            return;
        }

        $webAppUrl = (string) config('services.telegram.mahalla.webapp_url');
        $api = TelegramBotApi::mahalla();

        $greeting = implode("\n", [
            '👋 <b>Mahalla Fix</b> — shahar muammolarini xabar qilish tizimi.',
            '',
            "Yo'l teshigi, buzuq ko'cha chirog'i, suv yoki gaz sizishini ko'rdingizmi?",
            "Rasmga oling — biz joylashuvni aniqlab, rasmiy murojaat shakllantiramiz.",
            '',
            'Boshlash uchun pastdagi tugmani bosing 👇',
        ]);

        $replyMarkup = $webAppUrl
            ? ['inline_keyboard' => [[[
                'text'    => '🏙 Muammoni xabar qilish',
                'web_app' => ['url' => $webAppUrl],
            ]]]]
            : null;

        $api->sendMessage($chatId, $greeting, $replyMarkup);
    }
}
