<?php

namespace Tests\Feature\Telegram;

use App\Models\Company;
use App\Models\MaintenanceRequest;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PM\Project;
use App\Models\Resident;
use App\Models\TelegramSession;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WebhookTest extends TestCase
{
    use DatabaseTransactions;

    protected Company $company;
    protected Apartment $apartment;
    protected Resident $resident;
    protected Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.telegram.webhook_secret' => 'test-webhook-secret']);

        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => []], 200),
        ]);

        $this->company = Company::firstOrCreate(
            ['slug' => 'proptech-uz'],
            ['name' => '1Mahalla HQ', 'is_active' => true]
        );

        $project = Project::create([
            'company_id' => $this->company->id,
            'name' => 'Test PM Project',
            'status' => 'active',
        ]);

        $building = Building::create([
            'pm_project_id' => $project->id,
            'name' => 'Block A',
            'monthly_fee_per_sqm' => 1.50,
        ]);

        $this->apartment = Apartment::create([
            'pm_building_id' => $building->id,
            'floor' => 3,
            'number' => '12',
            'rooms' => 2,
            'area' => 54,
        ]);

        $this->resident = Resident::create([
            'company_id' => $this->company->id,
            'apartment_id' => $this->apartment->id,
            'full_name' => 'Aziz Karimov',
            'phone' => '+998 90 123 45 67',
            'resident_type' => 'owner',
            'is_active' => true,
        ]);

        $this->vendor = Vendor::create([
            'company_id' => $this->company->id,
            'name' => 'Super Plumber UZ',
            'phone' => '+998 91 222 33 44',
            'specializations' => ['plumbing'],
            'is_active' => true,
        ]);
    }

    protected function postUpdate(array $update)
    {
        return $this->postJson(
            route('telegram.webhook'),
            $update,
            ['X-Telegram-Bot-Api-Secret-Token' => 'test-webhook-secret']
        );
    }

    protected function chatPayload(string $chatId, array $from = []): array
    {
        return [
            'id' => (int) $chatId,
            'type' => 'private',
        ];
    }

    public function test_webhook_rejects_requests_with_invalid_secret(): void
    {
        $response = $this->postJson(route('telegram.webhook'), [
            'message' => ['chat' => ['id' => 111, 'type' => 'private'], 'text' => '/start'],
        ], ['X-Telegram-Bot-Api-Secret-Token' => 'wrong-secret']);

        $response->assertStatus(403);
    }

    public function test_contact_share_links_existing_resident(): void
    {
        $chatId = '555111000';
        $from = ['id' => (int) $chatId, 'username' => 'aziz_dev', 'first_name' => 'Aziz', 'last_name' => 'Karimov'];

        $response = $this->postUpdate([
            'update_id' => 1,
            'message' => [
                'message_id' => 1,
                'chat' => $this->chatPayload($chatId),
                'from' => $from,
                'contact' => [
                    'phone_number' => '+998901234567',
                    'first_name' => 'Aziz',
                ],
            ],
        ]);

        $response->assertOk();

        $session = TelegramSession::where('chat_id', $chatId)->first();
        $this->assertNotNull($session);
        $this->assertSame($this->resident->id, $session->active_resident_id);
        $this->assertSame('resident', $session->active_role);

        $this->assertSame($chatId, $this->resident->fresh()->telegram_chat_id);
    }

    public function test_contact_share_links_existing_vendor(): void
    {
        $chatId = '555222000';
        $from = ['id' => (int) $chatId, 'username' => 'plumber_dev', 'first_name' => 'Sherzod'];

        $response = $this->postUpdate([
            'update_id' => 2,
            'message' => [
                'message_id' => 1,
                'chat' => $this->chatPayload($chatId),
                'from' => $from,
                'contact' => [
                    'phone_number' => '+998912223344',
                    'first_name' => 'Sherzod',
                ],
            ],
        ]);

        $response->assertOk();

        $session = TelegramSession::where('chat_id', $chatId)->first();
        $this->assertNotNull($session);
        $this->assertSame($this->vendor->id, $session->vendor_id);
        $this->assertSame('vendor', $session->active_role);

        $this->assertSame($chatId, $this->vendor->fresh()->telegram_chat_id);
    }

    public function test_contact_share_with_unknown_number_does_not_link(): void
    {
        $chatId = '555333000';
        $from = ['id' => (int) $chatId, 'first_name' => 'Stranger'];

        $response = $this->postUpdate([
            'update_id' => 3,
            'message' => [
                'message_id' => 1,
                'chat' => $this->chatPayload($chatId),
                'from' => $from,
                'contact' => [
                    'phone_number' => '+998999999999',
                    'first_name' => 'Stranger',
                ],
            ],
        ]);

        $response->assertOk();

        $session = TelegramSession::where('chat_id', $chatId)->first();
        $this->assertNotNull($session);
        $this->assertFalse($session->isLinked());
    }

    public function test_full_new_request_wizard_creates_maintenance_request(): void
    {
        $chatId = '555444000';
        $from = ['id' => (int) $chatId, 'username' => 'aziz_dev', 'first_name' => 'Aziz', 'last_name' => 'Karimov'];

        // 1. /start (not linked yet) -> prompts for phone share
        $this->postUpdate([
            'update_id' => 10,
            'message' => [
                'message_id' => 1,
                'chat' => $this->chatPayload($chatId),
                'from' => $from,
                'text' => '/start',
            ],
        ])->assertOk();

        // 2. Share contact -> links resident + sends menu
        $this->postUpdate([
            'update_id' => 11,
            'message' => [
                'message_id' => 2,
                'chat' => $this->chatPayload($chatId),
                'from' => $from,
                'contact' => ['phone_number' => '+998901234567', 'first_name' => 'Aziz'],
            ],
        ])->assertOk();

        // 3. Tap "📝 Yangi murojaat" -> starts the new-request wizard
        $this->postUpdate([
            'update_id' => 12,
            'message' => [
                'message_id' => 3,
                'chat' => $this->chatPayload($chatId),
                'from' => $from,
                'text' => '📝 Yangi murojaat',
            ],
        ])->assertOk();

        $session = TelegramSession::where('chat_id', $chatId)->first();
        $this->assertSame('new_request:category', $session->state);

        // 4. Pick category via inline keyboard callback
        $this->postUpdate([
            'update_id' => 13,
            'callback_query' => [
                'id' => 'cb1',
                'from' => $from,
                'message' => ['message_id' => 4, 'chat' => $this->chatPayload($chatId)],
                'data' => 'cat:plumbing',
            ],
        ])->assertOk();

        // 5. Pick priority via inline keyboard callback
        $this->postUpdate([
            'update_id' => 14,
            'callback_query' => [
                'id' => 'cb2',
                'from' => $from,
                'message' => ['message_id' => 5, 'chat' => $this->chatPayload($chatId)],
                'data' => 'pri:high',
            ],
        ])->assertOk();

        // 6. Enter title as free text
        $this->postUpdate([
            'update_id' => 15,
            'message' => [
                'message_id' => 6,
                'chat' => $this->chatPayload($chatId),
                'from' => $from,
                'text' => 'Oshxonada kran oqayapti',
            ],
        ])->assertOk();

        // 7. Skip description
        $this->postUpdate([
            'update_id' => 16,
            'callback_query' => [
                'id' => 'cb3',
                'from' => $from,
                'message' => ['message_id' => 7, 'chat' => $this->chatPayload($chatId)],
                'data' => 'desc_skip',
            ],
        ])->assertOk();

        // 8. Skip photo -> finalizes the request
        $this->postUpdate([
            'update_id' => 17,
            'callback_query' => [
                'id' => 'cb4',
                'from' => $from,
                'message' => ['message_id' => 8, 'chat' => $this->chatPayload($chatId)],
                'data' => 'photo_skip',
            ],
        ])->assertOk();

        $this->assertDatabaseHas('maintenance_requests', [
            'title' => 'Oshxonada kran oqayapti',
            'category' => 'plumbing',
            'priority' => 'high',
            'status' => 'open',
            'resident_id' => $this->resident->id,
            'apartment_id' => $this->apartment->id,
            'building_id' => $this->apartment->pm_building_id,
            'company_id' => $this->company->id,
        ]);

        $session = $session->fresh();
        $this->assertSame('idle', $session->state);
        $this->assertNull($session->context);
    }
}
