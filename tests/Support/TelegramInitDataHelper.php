<?php

namespace Tests\Support;

trait TelegramInitDataHelper
{
    /**
     * Builds a Telegram WebApp `initData` query string with a valid hash,
     * following https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
     */
    protected function buildInitData(array $params, string $botToken): string
    {
        ksort($params);

        $pairs = [];
        foreach ($params as $key => $value) {
            $pairs[] = "{$key}={$value}";
        }
        $checkString = implode("\n", $pairs);

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $hash = hash_hmac('sha256', $checkString, $secretKey);

        $params['hash'] = $hash;

        return http_build_query($params);
    }
}
