<?php

namespace Tests\Unit\Telegram;

use App\Services\Telegram\WebAppAuth;
use Tests\Support\TelegramInitDataHelper;
use Tests\TestCase;

class WebAppAuthTest extends TestCase
{
    use TelegramInitDataHelper;

    public function test_validates_correctly_signed_init_data(): void
    {
        config(['services.telegram.user_bot_token' => 'TEST_BOT_TOKEN_123456']);

        $user = ['id' => 123456789, 'first_name' => 'Aziz', 'username' => 'aziz_dev'];

        $initData = $this->buildInitData([
            'auth_date' => '1700000000',
            'query_id' => 'AAabc123',
            'user' => json_encode($user),
        ], 'TEST_BOT_TOKEN_123456');

        $result = (new WebAppAuth())->validate($initData);

        $this->assertNotNull($result);
        $this->assertSame(123456789, $result['user']['id']);
        $this->assertSame('aziz_dev', $result['user']['username']);
        $this->assertSame('1700000000', $result['auth_date']);
    }

    public function test_rejects_tampered_init_data(): void
    {
        config(['services.telegram.user_bot_token' => 'TEST_BOT_TOKEN_123456']);

        $user = ['id' => 123456789, 'first_name' => 'Aziz'];

        $initData = $this->buildInitData([
            'auth_date' => '1700000000',
            'user' => json_encode($user),
        ], 'TEST_BOT_TOKEN_123456');

        // Tamper with the signed payload after the hash was computed.
        $tampered = str_replace('Aziz', 'Hacker', $initData);

        $result = (new WebAppAuth())->validate($tampered);

        $this->assertNull($result);
    }

    public function test_rejects_init_data_signed_with_different_bot_token(): void
    {
        config(['services.telegram.user_bot_token' => 'TEST_BOT_TOKEN_123456']);

        $initData = $this->buildInitData([
            'auth_date' => '1700000000',
            'user' => json_encode(['id' => 1, 'first_name' => 'Aziz']),
        ], 'DIFFERENT_BOT_TOKEN');

        $result = (new WebAppAuth())->validate($initData);

        $this->assertNull($result);
    }

    public function test_rejects_when_hash_is_missing(): void
    {
        config(['services.telegram.user_bot_token' => 'TEST_BOT_TOKEN_123456']);

        $result = (new WebAppAuth())->validate('auth_date=1700000000&user=%7B%7D');

        $this->assertNull($result);
    }

    public function test_rejects_when_bot_token_not_configured(): void
    {
        config(['services.telegram.user_bot_token' => null]);

        $initData = $this->buildInitData([
            'auth_date' => '1700000000',
            'user' => json_encode(['id' => 1, 'first_name' => 'Aziz']),
        ], 'TEST_BOT_TOKEN_123456');

        $result = (new WebAppAuth())->validate($initData);

        $this->assertNull($result);
    }
}
