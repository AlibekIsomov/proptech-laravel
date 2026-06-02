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

class ApartmentTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;
    protected Project $project;
    protected Building $building;
    protected Apartment $apartment;

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
            'company_id'  => $this->company->id,
            'name'        => 'Test PM Project',
            'status'      => 'active',
        ]);

        $this->building = Building::create([
            'pm_project_id'       => $this->project->id,
            'name'                => 'Block A',
            'monthly_fee_per_sqm' => 1.50,
        ]);

        $this->apartment = Apartment::create([
            'pm_building_id' => $this->building->id,
            'floor'          => 2,
            'number'         => '2A',
            'rooms'          => 3,
            'area'           => 85.50,
        ]);
    }

    public function test_apartment_details_can_be_retrieved(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.apartments.detail', $this->apartment));

        $response->assertOk();
        $response->assertJsonStructure([
            'apartment' => ['id', 'number', 'floor', 'size_m2', 'rooms_count', 'building'],
            'resident',
            'requests',
            'meters',
            'invoices',
        ]);

        $response->assertJsonPath('apartment.number', '2A');
        $response->assertJsonPath('apartment.floor', 2);
    }

    public function test_building_floor_plan_can_be_retrieved(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.buildings.floor-plan', $this->building));

        $response->assertOk();
        $response->assertJsonStructure([
            'floors',
            'apartments',
            'managers',
        ]);
    }

    public function test_floor_plan_marks_apartment_as_sold_when_resident_exists(): void
    {
        Resident::create([
            'company_id'    => $this->company->id,
            'apartment_id'  => $this->apartment->id,
            'full_name'     => 'Active Resident',
            'resident_type' => 'owner',
            'is_active'     => true,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('pm.buildings.floor-plan', $this->building));

        $response->assertOk();
        $apt = collect($response->json('apartments'))->firstWhere('id', $this->apartment->id);
        $this->assertEquals('sold', $apt['status']);
    }

    public function test_floor_plan_marks_apartment_as_available_without_resident(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.buildings.floor-plan', $this->building));

        $response->assertOk();
        $apt = collect($response->json('apartments'))->firstWhere('id', $this->apartment->id);
        $this->assertEquals('available', $apt['status']);
    }

    public function test_pm_apartment_can_be_created_via_store_route(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('pm.apartments.store'), [
                'pm_building_id' => $this->building->id,
                'floor'          => 5,
                'number'         => '501',
                'rooms'          => 2,
                'area'           => 65.00,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('pm_apartments', [
            'number'         => '501',
            'floor'          => 5,
            'pm_building_id' => $this->building->id,
        ]);
    }

    public function test_pm_apartment_store_rejects_invalid_building(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('pm.apartments.store'), [
                'pm_building_id' => 'non-existent-uuid',
                'floor'          => 1,
                'number'         => '101',
                'rooms'          => 1,
            ]);

        $response->assertSessionHasErrors(['pm_building_id']);
    }

    public function test_pm_apartment_can_be_updated(): void
    {
        $response = $this->actingAs($this->user)
            ->put(route('pm.apartments.update', $this->apartment), [
                'floor'  => 3,
                'number' => '3X',
                'rooms'  => 4,
                'area'   => 95.00,
            ]);

        $response->assertRedirect();
        $this->assertEquals('3X', $this->apartment->fresh()->number);
        $this->assertEquals(4, $this->apartment->fresh()->rooms);
    }

    public function test_pm_apartment_can_be_deleted(): void
    {
        $aptId = $this->apartment->id;

        $response = $this->actingAs($this->user)
            ->delete(route('pm.apartments.destroy', $this->apartment));

        $response->assertRedirect();
        $this->assertNull(Apartment::find($aptId));
    }

    public function test_pm_apartment_bulk_generate_creates_correct_count(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('pm.apartments.bulk-generate'), [
                'pm_building_id'       => $this->building->id,
                'floors'               => 3,
                'apartments_per_floor' => 4,
                'rooms'                => 2,
                'area'                 => 60.00,
            ]);

        $response->assertRedirect();

        $count = Apartment::where('pm_building_id', $this->building->id)
            ->where('number', 'like', '1__') // floors 1-3
            ->count();

        $this->assertEquals(12, Apartment::where('pm_building_id', $this->building->id)
            ->whereNotIn('id', [$this->apartment->id]) // exclude the one from setUp
            ->count());
    }

    public function test_pm_apartment_bulk_generate_rejects_sales_building(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('pm.apartments.bulk-generate'), [
                'pm_building_id'       => 'non-existent-uuid',
                'floors'               => 2,
                'apartments_per_floor' => 2,
                'rooms'                => 1,
            ]);

        $response->assertSessionHasErrors(['pm_building_id']);
    }

    public function test_update_status_returns_success_as_noop(): void
    {
        $response = $this->actingAs($this->user)
            ->patch(route('pm.apartments.update-status', $this->apartment), [
                'status' => 'reserved',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);
    }
}
