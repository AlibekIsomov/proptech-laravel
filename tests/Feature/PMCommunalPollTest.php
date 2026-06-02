<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\CommunalAsset;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PM\Project;
use App\Models\Poll;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PMCommunalPollTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;
    protected Building $building;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::firstOrCreate(
            ['slug' => 'proptech-uz'],
            ['name' => '1Mahalla HQ', 'is_active' => true]
        );

        $this->user = User::firstOrCreate(
            ['email' => 'admin@proptech.uz'],
            [
                'full_name'  => 'Super Admin',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company->id,
            ]
        );

        if (!$this->user->hasRole('super_admin')) {
            $this->user->assignRole('super_admin');
        }

        $project = Project::create([
            'company_id' => $this->company->id,
            'name'       => 'Test PM Project',
            'status'     => 'active',
        ]);

        $this->building = Building::create([
            'pm_project_id'       => $project->id,
            'name'                => 'Block A',
            'monthly_fee_per_sqm' => 1.50,
        ]);
    }

    // ── CommunalAsset ─────────────────────────────────────────────────────────

    public function test_communal_index_page_renders(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.communal.index'));

        $response->assertOk();
    }

    public function test_communal_assets_can_be_listed_by_building(): void
    {
        CommunalAsset::create([
            'building_id' => $this->building->id,
            'company_id'  => $this->company->id,
            'name'        => 'Main Elevator',
            'asset_type'  => 'elevator',
            'status'      => 'operational',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('pm.communal.index', ['pm_building_id' => $this->building->id]));

        $response->assertOk();
        $response->assertJsonFragment(['name' => 'Main Elevator']);
    }

    public function test_communal_asset_returned_with_pm_building_id_key(): void
    {
        CommunalAsset::create([
            'building_id' => $this->building->id,
            'company_id'  => $this->company->id,
            'name'        => 'Parking Gate',
            'asset_type'  => 'parking',
            'status'      => 'operational',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('pm.communal.index', ['pm_building_id' => $this->building->id]));

        $response->assertOk();
        $asset = collect($response->json('assets'))->firstWhere('name', 'Parking Gate');
        $this->assertNotNull($asset);
        $this->assertEquals($this->building->id, $asset['pm_building_id']);
    }

    public function test_communal_asset_can_be_created_and_saved_to_db(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson(route('pm.communal.store'), [
                'pm_building_id'     => $this->building->id,
                'name'               => 'Lobby Entrance Door',
                'asset_type'         => 'entrance',
                'status'             => 'operational',
                'description'        => 'Main lobby door',
                'last_inspection_date' => '2026-05-01',
                'next_inspection_date' => '2026-11-01',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('communal_assets', [
            'name'        => 'Lobby Entrance Door',
            'building_id' => $this->building->id,
            'company_id'  => $this->company->id,
        ]);
    }

    public function test_communal_asset_store_rejects_invalid_building(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson(route('pm.communal.store'), [
                'pm_building_id' => '00000000-0000-0000-0000-000000000000',
                'name'           => 'Ghost Asset',
                'asset_type'     => 'elevator',
                'status'         => 'operational',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pm_building_id']);
    }

    public function test_communal_asset_can_be_updated(): void
    {
        $asset = CommunalAsset::create([
            'building_id' => $this->building->id,
            'company_id'  => $this->company->id,
            'name'        => 'Old Elevator',
            'asset_type'  => 'elevator',
            'status'      => 'maintenance',
        ]);

        $response = $this->actingAs($this->user)
            ->putJson(route('pm.communal.update', $asset), [
                'name'       => 'Repaired Elevator',
                'asset_type' => 'elevator',
                'status'     => 'operational',
            ]);

        $response->assertOk();
        $this->assertEquals('operational', $asset->fresh()->status);
        $this->assertEquals('Repaired Elevator', $asset->fresh()->name);
    }

    public function test_communal_asset_can_be_deleted(): void
    {
        $asset = CommunalAsset::create([
            'building_id' => $this->building->id,
            'company_id'  => $this->company->id,
            'name'        => 'Deletable Roof',
            'asset_type'  => 'roof',
            'status'      => 'retired',
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson(route('pm.communal.destroy', $asset));

        $response->assertOk();
        $this->assertNull(CommunalAsset::find($asset->id));
    }

    // ── Polls ─────────────────────────────────────────────────────────────────

    public function test_polls_index_page_renders(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.polls.index'));

        $response->assertOk();
    }

    public function test_polls_can_be_listed_by_building(): void
    {
        Poll::create([
            'building_id' => $this->building->id,
            'created_by'  => $this->user->id,
            'title'       => 'Elevator Renovation Vote',
            'options'     => [
                ['id' => 'yes', 'label' => 'Yes'],
                ['id' => 'no',  'label' => 'No'],
            ],
            'status'     => 'open',
            'quorum_pct' => 50,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('pm.polls.index', ['pm_building_id' => $this->building->id]));

        $response->assertOk();
        $response->assertJsonFragment(['title' => 'Elevator Renovation Vote']);
    }

    public function test_poll_returned_with_pm_building_id_key(): void
    {
        Poll::create([
            'building_id' => $this->building->id,
            'created_by'  => $this->user->id,
            'title'       => 'Parking Rules',
            'options'     => [
                ['id' => 'a', 'label' => 'Option A'],
                ['id' => 'b', 'label' => 'Option B'],
            ],
            'status'     => 'open',
            'quorum_pct' => 30,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('pm.polls.index', ['pm_building_id' => $this->building->id]));

        $response->assertOk();
        $poll = collect($response->json('polls'))->firstWhere('title', 'Parking Rules');
        $this->assertNotNull($poll);
        $this->assertEquals($this->building->id, $poll['pm_building_id']);
    }

    public function test_poll_can_be_created_and_saved_to_db(): void
    {
        // Also create apartments to get apartment_count
        Apartment::create(['pm_building_id' => $this->building->id, 'floor' => 1, 'number' => '101', 'rooms' => 2]);

        $response = $this->actingAs($this->user)
            ->postJson(route('pm.polls.store'), [
                'pm_building_id' => $this->building->id,
                'title'          => 'Repair Fund Decision',
                'description'    => 'Should we create a repair fund?',
                'options'        => [
                    ['id' => 'yes', 'label' => 'Yes, create it'],
                    ['id' => 'no',  'label' => 'No, not yet'],
                ],
                'quorum_pct' => 51,
                'closes_at'  => '2026-12-31',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('polls', [
            'title'       => 'Repair Fund Decision',
            'building_id' => $this->building->id,
            'status'      => 'open',
        ]);
    }

    public function test_poll_store_rejects_invalid_building(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson(route('pm.polls.store'), [
                'pm_building_id' => '00000000-0000-0000-0000-000000000000',
                'title'          => 'Ghost Poll',
                'options'        => [
                    ['id' => 'a', 'label' => 'A'],
                    ['id' => 'b', 'label' => 'B'],
                ],
                'quorum_pct' => 50,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pm_building_id']);
    }

    public function test_poll_status_can_be_closed(): void
    {
        $poll = Poll::create([
            'building_id' => $this->building->id,
            'created_by'  => $this->user->id,
            'title'       => 'Close Me',
            'options'     => [
                ['id' => 'yes', 'label' => 'Yes'],
                ['id' => 'no',  'label' => 'No'],
            ],
            'status'     => 'open',
            'quorum_pct' => 50,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson(route('pm.polls.update', $poll), ['status' => 'closed']);

        $response->assertOk();
        $this->assertEquals('closed', $poll->fresh()->status);
    }

    public function test_poll_can_be_deleted(): void
    {
        $poll = Poll::create([
            'building_id' => $this->building->id,
            'created_by'  => $this->user->id,
            'title'       => 'Deletable Poll',
            'options'     => [
                ['id' => 'a', 'label' => 'A'],
                ['id' => 'b', 'label' => 'B'],
            ],
            'status'     => 'open',
            'quorum_pct' => 30,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson(route('pm.polls.destroy', $poll));

        $response->assertOk();
        $this->assertNull(Poll::find($poll->id));
    }
}
