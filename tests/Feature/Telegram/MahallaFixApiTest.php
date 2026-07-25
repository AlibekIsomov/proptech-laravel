<?php

namespace Tests\Feature\Telegram;

use App\Jobs\Telegram\NotifyCityReportCreated;
use App\Models\CityReport;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\TelegramInitDataHelper;
use Tests\TestCase;

class MahallaFixApiTest extends TestCase
{
    use DatabaseTransactions;
    use TelegramInitDataHelper;

    protected const BOT_TOKEN = 'MAHALLA_TEST_TOKEN_654321';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.telegram.mahalla.bot_token' => self::BOT_TOKEN]);
    }

    protected function authHeader(int $tgUserId, array $extraUser = []): array
    {
        $user = array_merge(['id' => $tgUserId, 'first_name' => 'Aziz'], $extraUser);

        $initData = $this->buildInitData([
            'auth_date' => (string) time(),
            'user' => json_encode($user),
        ], self::BOT_TOKEN);

        return ['Authorization' => 'tma '.$initData];
    }

    public function test_report_endpoint_requires_valid_auth(): void
    {
        $this->postJson('/mahalla-fix/api/reports', [])->assertUnauthorized();
    }

    public function test_citizen_can_submit_report_with_photo_and_gps(): void
    {
        Storage::fake('public');
        Queue::fake();

        // Vision AI javobini soxtalashtirish
        config(['services.anthropic.key' => 'test-key']);
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [[
                    'type' => 'text',
                    'text' => '{"category":"pothole","priority":"high","title":"Yo\'l teshigi","summary":"Yo\'lda katta teshik aniqlandi."}',
                ]],
            ]),
        ]);

        $response = $this->postJson('/mahalla-fix/api/reports', [
            'latitude' => 41.311081,
            'longitude' => 69.240562,
            'photo' => UploadedFile::fake()->image('pothole.jpg'),
            'description' => 'Katta chuqur',
        ], $this->authHeader(555000111));

        $response->assertCreated();
        $response->assertJsonPath('data.category', 'pothole');
        $response->assertJsonPath('data.priority', 'high');
        $response->assertJsonPath('data.status', 'submitted');

        $this->assertStringStartsWith('MF-', $response->json('data.ticket_code'));

        $report = CityReport::where('reporter_telegram_id', '555000111')->first();
        $this->assertNotNull($report);
        $this->assertSame('pothole', $report->ai_category);
        $this->assertEqualsWithDelta(41.311081, (float) $report->latitude, 0.0001);
        Storage::disk('public')->assertExists($report->photo_path);

        Queue::assertPushed(NotifyCityReportCreated::class);
    }

    public function test_report_requires_photo_and_coordinates(): void
    {
        $this->postJson('/mahalla-fix/api/reports', [
            'description' => 'no photo',
        ], $this->authHeader(555000112))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['latitude', 'longitude', 'photo']);
    }

    public function test_index_returns_only_own_reports(): void
    {
        CityReport::create([
            'reporter_telegram_id' => '555000113',
            'latitude' => 41.3, 'longitude' => 69.2,
            'category' => 'garbage', 'priority' => 'medium', 'title' => 'Mine', 'status' => 'submitted',
        ]);
        CityReport::create([
            'reporter_telegram_id' => '999999999',
            'latitude' => 41.3, 'longitude' => 69.2,
            'category' => 'garbage', 'priority' => 'medium', 'title' => 'Someone else', 'status' => 'submitted',
        ]);

        $response = $this->getJson('/mahalla-fix/api/reports', $this->authHeader(555000113));

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Mine');
    }

    public function test_cannot_view_another_users_report(): void
    {
        $other = CityReport::create([
            'reporter_telegram_id' => '999999999',
            'latitude' => 41.3, 'longitude' => 69.2,
            'category' => 'garbage', 'priority' => 'medium', 'title' => 'Private', 'status' => 'submitted',
        ]);

        $this->getJson("/mahalla-fix/api/reports/{$other->id}", $this->authHeader(555000114))
            ->assertNotFound();
    }
}
