<?php

namespace App\Http\Middleware\Telegram;

use App\Services\Telegram\WebAppAuth;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mahalla Fix Mini App so'rovlarini `Authorization: tma <initData>` orqali tekshiradi.
 *
 * Aholi/Pudratchi botidan (AuthenticateWebApp) ALOHIDA: Mahalla Fix botining tokeni
 * bilan validatsiya qiladi va TelegramSession yaratmaydi (ro'yxatdan o'tish shart emas) —
 * tekshirilgan Telegram foydalanuvchisini to'g'ridan-to'g'ri so'rovga bog'laydi.
 */
class AuthenticateMahallaWebApp
{
    public function __construct(protected WebAppAuth $webAppAuth)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $header = (string) $request->header('Authorization', '');

        if (! str_starts_with($header, 'tma ')) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $initData = substr($header, 4);
        $token = (string) config('services.telegram.mahalla.bot_token');
        $validated = $this->webAppAuth->validate($initData, $token);

        if (! $validated || empty($validated['user']['id'])) {
            Log::warning('Mahalla WebApp auth: initData validation failed', [
                'init_data_length'     => strlen($initData),
                'bot_token_configured' => filled($token),
            ]);

            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->attributes->set('telegramUser', $validated['user']);

        return $next($request);
    }
}
