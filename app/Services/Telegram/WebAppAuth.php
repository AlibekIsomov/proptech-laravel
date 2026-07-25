<?php

namespace App\Services\Telegram;

use Illuminate\Support\Facades\Log;

/**
 * Telegram Mini App `initData` ni tekshirish (HMAC-SHA256).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
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
        $hadSignature = isset($data['signature']);
        // `hash` VA `signature`ni check-string'dan chiqaramiz. `signature` (Ed25519)
        // yangi Telegram versiyalarida qo'shiladi; HMAC tekshiruvi undan tashqari
        // barcha maydonlar bo'yicha hisoblanadi — aks holda yangi ilovalarda 401 bo'ladi.
        unset($data['hash'], $data['signature']);

        ksort($data);

        $pairs = [];
        foreach ($data as $key => $value) {
            $pairs[] = "{$key}={$value}";
        }
        $checkString = implode("\n", $pairs);

        $secretKey = hash_hmac('sha256', $token, 'WebAppData', true);
        $computedHash = hash_hmac('sha256', $checkString, $secretKey);

        if (! hash_equals($computedHash, $hash)) {
            // DIAGNOSTIKA (vaqtincha) — initData qaysi bot tokeni bilan imzolanganini aniqlash.
            // Resident/Pudratchi bot tokeni bilan ham tekshiramiz: agar u mos kelsa,
            // foydalanuvchi Mini App'ni noto'g'ri bot orqali ochgan.
            $residentToken = (string) config('services.telegram.user_bot_token');
            $matchesResident = false;
            if ($residentToken !== '') {
                $rKey = hash_hmac('sha256', $residentToken, 'WebAppData', true);
                $matchesResident = hash_equals(hash_hmac('sha256', $checkString, $rKey), $hash);
            }

            Log::warning('WebApp initData HMAC mismatch', [
                'fields'          => implode(',', array_keys($data)),
                'had_signature'   => $hadSignature,
                'token_tail'      => substr((string) $token, -6),
                'matches_resident' => $matchesResident,
                'computed_head'   => substr($computedHash, 0, 10),
                'received_head'   => substr((string) $hash, 0, 10),
            ]);

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
