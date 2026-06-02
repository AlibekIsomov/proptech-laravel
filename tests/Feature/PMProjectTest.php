<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PM\Project;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PMProjectTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;
    protected Project $project;
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

        $this->project = Project::create([
            'company_id' => $this->company->id,
            'name'       => 'Mirzo Ulugbek Residence',
            'location'   => 'Tashkent',
            'status'     => 'active',
        ]);

        $this->building = Building::create([
            'pm_project_id'       => $this->project->id,
            'name'                => 'A Corpus',
            'monthly_fee_per_sqm' => 2.00,
        ]);
    }

    // ── Project CRUD ─────────────────────────────────────────────────────────

    public function test_projects_index_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.projects.index'));

        $response->assertOk();
    }

    public function test_project_can_be_created(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('pm.projects.store'), [
                'name'     => 'New Residence',
                'location' => 'Samarkand',
                'status'   => 'active',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('pm_projects', [
            'name'       => 'New Residence',
            'location'   => 'Samarkand',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_project_can_be_updated(): void
    {
        $response = $this->actingAs($this->user)
            ->put(route('pm.projects.update', $this->project), [
                'name'     => 'Updated Name',
                'location' => 'Bukhara',
                'status'   => 'completed',
            ]);

        $response->assertRedirect();

        $fresh = $this->project->fresh();
        $this->assertEquals('Updated Name', $fresh->name);
        $this->assertEquals('completed', $fresh->status);
    }

    public function test_project_can_be_deleted(): void
    {
        $projectId = $this->project->id;

        $response = $this->actingAs($this->user)
            ->delete(route('pm.projects.destroy', $this->project));

        $response->assertRedirect();
        $this->assertNull(Project::find($projectId));
    }

    // ── Project show with apt stats ───────────────────────────────────────────

    public function test_project_show_returns_correct_stats_no_residents(): void
    {
        Apartment::create(['pm_building_id' => $this->building->id, 'floor' => 1, 'number' => '101', 'rooms' => 2]);
        Apartment::create(['pm_building_id' => $this->building->id, 'floor' => 1, 'number' => '102', 'rooms' => 2]);

        $response = $this->actingAs($this->user)
            ->get(route('pm.projects.show', $this->project));

        $response->assertOk();
        $stats = $response->viewData('page')['props']['aptStats'];
        $buildingStats = $stats[$this->building->id] ?? null;

        $this->assertNotNull($buildingStats);
        $this->assertEquals(2, $buildingStats['total']);
        $this->assertEquals(2, $buildingStats['available']);
        $this->assertEquals(0, $buildingStats['sold']);
    }

    public function test_project_show_counts_occupied_apartments_via_residents(): void
    {
        $apt1 = Apartment::create(['pm_building_id' => $this->building->id, 'floor' => 1, 'number' => '101', 'rooms' => 2]);
        $apt2 = Apartment::create(['pm_building_id' => $this->building->id, 'floor' => 1, 'number' => '102', 'rooms' => 2]);

        Resident::create([
            'company_id'    => $this->company->id,
            'apartment_id'  => $apt1->id,
            'full_name'     => 'Active Resident',
            'resident_type' => 'owner',
            'is_active'     => true,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('pm.projects.show', $this->project));

        $response->assertOk();
        $stats = $response->viewData('page')['props']['aptStats'];
        $buildingStats = $stats[$this->building->id] ?? null;

        $this->assertNotNull($buildingStats);
        $this->assertEquals(2, $buildingStats['total']);
        $this->assertEquals(1, $buildingStats['available']);
        $this->assertEquals(1, $buildingStats['sold']);
    }

    // ── Building management ───────────────────────────────────────────────────

    public function test_building_can_be_added_to_project(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('pm.projects.buildings.store', $this->project), [
                'name'                => 'B Corpus',
                'monthly_fee_per_sqm' => 1.75,
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('pm_buildings', [
            'name'                => 'B Corpus',
            'pm_project_id'       => $this->project->id,
            'monthly_fee_per_sqm' => 1.75,
        ]);
    }

    public function test_pm_building_model_relationships_resolve_correctly(): void
    {
        $apt = Apartment::create([
            'pm_building_id' => $this->building->id,
            'floor'          => 1,
            'number'         => '1A',
            'rooms'          => 2,
        ]);

        // Test that PM\Building can eager-load related models without undefined class errors
        $loaded = Building::with(['apartments', 'communalAssets', 'assets', 'inventoryItems', 'maintenanceRequests', 'polls'])
            ->find($this->building->id);

        $this->assertNotNull($loaded);
        $this->assertCount(1, $loaded->apartments);
        $this->assertCount(0, $loaded->communalAssets);
        $this->assertCount(0, $loaded->assets);
    }
}
