<?php

namespace App\Services\Telegram;

/**
 * Telegram Mini App `initData` ni tekshirish (HMAC-SHA256).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
class WebAppAuth
{
    /**
     * @return array{user: array|null, auth_date: ?string, raw: array}|null
     */
    public function validate(string $initData): ?array
    {
        $token = config('services.telegram.user_bot_token');

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
