<?php

namespace App\Http\Middleware\Telegram;

use App\Models\TelegramSession;
use App\Services\Telegram\WebAppAuth;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Telegram Mini App so'rovlarini `Authorization: tma <initData>` orqali tekshiradi
 * va mos `telegram_sessions` yozuvini so'rovga bog'laydi.
 */
class AuthenticateWebApp
{
    public function __construct(protected WebAppAuth $webAppAuth)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $header = (string) $request->header('Authorization', '');

        if (! str_starts_with($header, 'tma ')) {
            Log::warning('Telegram WebApp auth: missing/invalid Authorization header', [
                'header_present' => $header !== '',
                'header_prefix' => substr($header, 0, 10),
            ]);

            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $initData = substr($header, 4);
        $validated = $this->webAppAuth->validate($initData);

        if (! $validated || empty($validated['user']['id'])) {
            Log::warning('Telegram WebApp auth: initData validation failed', [
                'init_data_length' => strlen($initData),
                'bot_token_configured' => filled(config('services.telegram.user_bot_token')),
            ]);

            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $tgUser = $validated['user'];
        $chatId = (string) $tgUser['id'];

        $session = TelegramSession::firstOrCreate(
            ['chat_id' => $chatId],
            [
                'telegram_user_id' => $tgUser['id'],
                'telegram_username' => $tgUser['username'] ?? null,
                'first_name' => $tgUser['first_name'] ?? null,
                'last_name' => $tgUser['last_name'] ?? null,
                'state' => 'idle',
            ]
        );

        $request->attributes->set('telegramSession', $session);

        return $next($request);
    }
}
