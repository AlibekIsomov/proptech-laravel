<?php

namespace Tests\Feature;

use App\Models\Apartment;
use App\Models\Building;
use App\Models\Company;
use App\Models\Project;
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

        // Setup related structures
        $this->project = Project::create([
            'company_id' => $this->company->id,
            'name'       => 'Test Project',
            'city'       => 'Tashkent',
        ]);

        $this->building = Building::create([
            'project_id' => $this->project->id,
            'name'       => 'Block A',
        ]);

        $this->apartment = Apartment::create([
            'building_id' => $this->building->id,
            'floor'       => 2,
            'number'      => '2A',
            'rooms'       => 3,
            'area'        => 85.50,
            'price'       => 75000.00,
            'status'      => 'available',
        ]);
    }

    public function test_apartment_status_can_be_updated(): void
    {
        $response = $this->actingAs($this->user)
            ->patch(route('pm.apartments.update-status', $this->apartment), [
                'status' => 'reserved',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertEquals('reserved', $this->apartment->fresh()->status);
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
}
