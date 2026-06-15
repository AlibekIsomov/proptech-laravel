<?php

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Telegram\UpdateHandler;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WebhookController extends Controller
{
    /** Telegram bot uchun webhook entry point. */
    public function handle(Request $request, UpdateHandler $handler): Response
    {
        $secret = config('services.telegram.webhook_secret');

        if ($secret && $request->header('X-Telegram-Bot-Api-Secret-Token') !== $secret) {
            return response('Forbidden', 403);
        }

        $update = (array) $request->json()->all();

        try {
            $handler->process($update);
        } catch (\Throwable $e) {
            report($e);
        }

        // Telegram qayta urinishlarining oldini olish uchun har doim 200 qaytaramiz
        return response('OK', 200);
    }
}
