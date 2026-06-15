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
use Tests\Support\TelegramInitDataHelper;
use Tests\TestCase;

class WebAppApiTest extends TestCase
{
    use DatabaseTransactions;
    use TelegramInitDataHelper;

    protected const BOT_TOKEN = 'TEST_BOT_TOKEN_123456';

    protected Company $company;
    protected Apartment $apartment;
    protected Resident $resident;
    protected Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.telegram.user_bot_token' => self::BOT_TOKEN]);

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
            'floor' => 5,
            'number' => '21',
            'rooms' => 3,
            'area' => 72,
        ]);

        $this->resident = Resident::create([
            'company_id' => $this->company->id,
            'apartment_id' => $this->apartment->id,
            'full_name' => 'Dilnoza Yusupova',
            'phone' => '+998 90 555 11 22',
            'resident_type' => 'owner',
            'is_active' => true,
            'telegram_chat_id' => '999888777',
        ]);

        $this->vendor = Vendor::create([
            'company_id' => $this->company->id,
            'name' => 'Super Plumber UZ',
            'phone' => '+998 91 222 33 44',
            'specializations' => ['plumbing'],
            'is_active' => true,
        ]);
    }

    protected function authHeader(int $tgUserId, array $extraUser = []): array
    {
        $user = array_merge(['id' => $tgUserId, 'first_name' => 'Dilnoza'], $extraUser);

        $initData = $this->buildInitData([
            'auth_date' => (string) time(),
            'user' => json_encode($user),
        ], self::BOT_TOKEN);

        return ['Authorization' => 'tma '.$initData];
    }

    public function test_me_returns_not_linked_for_unknown_session(): void
    {
        $response = $this->getJson('/telegram-app/api/me', $this->authHeader(111222333));

        $response->assertOk();
        $response->assertJson(['linked' => false]);
    }

    public function test_me_returns_resident_profile_for_linked_session(): void
    {
        TelegramSession::create([
            'chat_id' => '999888777',
            'telegram_user_id' => '999888777',
            'telegram_username' => 'dilnoza_dev',
            'first_name' => 'Dilnoza',
            'resident_ids' => [$this->resident->id],
            'active_resident_id' => $this->resident->id,
            'active_role' => 'resident',
            'state' => 'idle',
        ]);

        $response = $this->getJson('/telegram-app/api/me', $this->authHeader(999888777));

        $response->assertOk();
        $response->assertJson([
            'linked' => true,
            'active_role' => 'resident',
            'can_switch_role' => false,
        ]);
        $response->assertJsonPath('resident.full_name', 'Dilnoza Yusupova');
        $response->assertJsonPath('resident.apartment.number', '21');
        $response->assertJsonPath('resident.apartment.building', 'Block A');
    }

    public function test_me_returns_both_roles_for_dual_linked_session(): void
    {
        $this->vendor->update(['telegram_chat_id' => '999888777']);

        TelegramSession::create([
            'chat_id' => '999888777',
            'telegram_user_id' => '999888777',
            'resident_ids' => [$this->resident->id],
            'active_resident_id' => $this->resident->id,
            'vendor_id' => $this->vendor->id,
            'active_role' => 'resident',
            'state' => 'idle',
        ]);

        $response = $this->getJson('/telegram-app/api/me', $this->authHeader(999888777));

        $response->assertOk();
        $response->assertJson(['linked' => true, 'can_switch_role' => true]);
        $response->assertJsonPath('vendor.name', 'Super Plumber UZ');
    }

    public function test_resident_requests_are_scoped_to_active_resident(): void
    {
        TelegramSession::create([
            'chat_id' => '999888777',
            'telegram_user_id' => '999888777',
            'resident_ids' => [$this->resident->id],
            'active_resident_id' => $this->resident->id,
            'active_role' => 'resident',
            'state' => 'idle',
        ]);

        $own = MaintenanceRequest::create([
            'apartment_id' => $this->apartment->id,
            'building_id' => $this->apartment->pm_building_id,
            'company_id' => $this->company->id,
            'resident_id' => $this->resident->id,
            'category' => 'plumbing',
            'priority' => 'medium',
            'status' => 'open',
            'title' => 'Mening murojaatim',
            'description' => '',
        ]);

        $otherResident = Resident::create([
            'company_id' => $this->company->id,
            'apartment_id' => $this->apartment->id,
            'full_name' => 'Boshqa Rezident',
            'phone' => '+998 90 999 88 77',
            'resident_type' => 'tenant',
            'is_active' => true,
        ]);

        MaintenanceRequest::create([
            'apartment_id' => $this->apartment->id,
            'building_id' => $this->apartment->pm_building_id,
            'company_id' => $this->company->id,
            'resident_id' => $otherResident->id,
            'category' => 'electrical',
            'priority' => 'low',
            'status' => 'open',
            'title' => 'Boshqa murojaat',
            'description' => '',
        ]);

        $response = $this->getJson('/telegram-app/api/resident/requests', $this->authHeader(999888777));

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $own->id);
        $response->assertJsonPath('data.0.title', 'Mening murojaatim');
    }

    public function test_resident_can_create_a_new_request(): void
    {
        TelegramSession::create([
            'chat_id' => '999888777',
            'telegram_user_id' => '999888777',
            'resident_ids' => [$this->resident->id],
            'active_resident_id' => $this->resident->id,
            'active_role' => 'resident',
            'state' => 'idle',
        ]);

        $response = $this->postJson('/telegram-app/api/resident/requests', [
            'category' => 'plumbing',
            'priority' => 'high',
            'title' => 'Kran buzilgan',
            'description' => 'Oshxonada kran oqayapti',
        ], $this->authHeader(999888777));

        $response->assertCreated();
        $response->assertJsonPath('data.title', 'Kran buzilgan');
        $response->assertJsonPath('data.status', 'open');

        $this->assertDatabaseHas('maintenance_requests', [
            'title' => 'Kran buzilgan',
            'resident_id' => $this->resident->id,
            'apartment_id' => $this->apartment->id,
            'building_id' => $this->apartment->pm_building_id,
            'company_id' => $this->company->id,
        ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/telegram-app/api/me')->assertStatus(401);
        $this->getJson('/telegram-app/api/me', ['Authorization' => 'tma invalid'])->assertStatus(401);
    }

    public function test_vendor_requests_are_forbidden_for_resident_only_session(): void
    {
        TelegramSession::create([
            'chat_id' => '999888777',
            'telegram_user_id' => '999888777',
            'resident_ids' => [$this->resident->id],
            'active_resident_id' => $this->resident->id,
            'active_role' => 'resident',
            'state' => 'idle',
        ]);

        $response = $this->getJson('/telegram-app/api/vendor/requests', $this->authHeader(999888777));

        $response->assertStatus(403);
    }
}
