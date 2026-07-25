<?php

namespace App\Services\Telegram;

/**
 * Telegram Mini App `initData` ni tekshirish (HMAC-SHA256).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Diqqat: HMAC data-check-string `hash`dan tashqari BARCHA maydonlarni o'z ichiga oladi —
 * shu jumladan yangi klientlardagi `signature` (Ed25519) maydonini ham. Faqat `hash`
 * chiqariladi; `signature`ni chiqarib tashlash yangi Telegram versiyalarida 401 beradi.
 */
class WebAppAuth
{
    /**
     * @param  string|null  $token  Tekshiriladigan bot tokeni. null bo'lsa — Aholi/Pudratchi boti.
     * @return array{user: array|null, auth_date: ?string, raw: array}|null
     */
    public function validate(string $initData, ?string $token = null): ?array
    {
        $token ??= config('services.telegram.user_bot_token');

        if (! $token || $initData === '') {
            return null;
        }

        parse_str($initData, $data);

        if (! isset($data['hash'])) {
            return null;
        }

        $hash = $data['hash'];
        unset($data['hash']);

        ksort($data);

        $pairs = [];
        foreach ($data as $key => $value) {
            $pairs[] = "{$key}={$value}";
        }
        $checkString = implode("\n", $pairs);

        $secretKey = hash_hmac('sha256', $token, 'WebAppData', true);
        $computedHash = hash_hmac('sha256', $checkString, $secretKey);

        if (! hash_equals($computedHash, $hash)) {
            return null;
        }

        $user = isset($data['user']) ? json_decode($data['user'], true) : null;

        return [
            'user' => $user,
            'auth_date' => $data['auth_date'] ?? null,
            'raw' => $data,
        ];
    }
}
