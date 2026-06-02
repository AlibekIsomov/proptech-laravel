<?php

namespace Tests\Feature;

use App\Models\Apartment;
use App\Models\Building;
use App\Models\Client;
use App\Models\Company;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SalesApartmentTest extends TestCase
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
            'company_id' => $this->company->id,
            'name'       => 'Test Apartment Project',
            'location'   => 'Tashkent',
        ]);

        $this->building = Building::create([
            'project_id' => $this->project->id,
            'name'       => 'Block A',
        ]);

        $this->apartment = Apartment::create([
            'building_id' => $this->building->id,
            'floor'       => 1,
            'number'      => '1A',
            'rooms'       => 2,
            'area'        => 55.00,
            'price'       => 45000.00,
            'status'      => 'available',
        ]);
    }

    public function test_apartments_list_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('apartments.index'));

        $response->assertOk();
    }

    public function test_apartment_can_be_created(): void
    {
        $payload = [
            'building_id' => $this->building->id,
            'floor'       => 2,
            'number'      => '2B',
            'rooms'       => 3,
            'area'        => 75.50,
            'price'       => 65000.00,
            'status'      => 'available',
            'type'        => '2br',
            'notes'       => 'Some notes',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('apartments.store'), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('apartments', [
            'building_id' => $this->building->id,
            'number'      => '2B',
        ]);
    }

    public function test_apartment_can_be_updated(): void
    {
        $payload = [
            'floor'  => 1,
            'number' => '1A-Updated',
            'rooms'  => 2,
            'area'   => 60.00,
            'price'  => 50000.00,
            'status' => 'reserved',
        ];

        $response = $this->actingAs($this->user)
            ->put(route('apartments.update', $this->apartment), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('apartments', [
            'id'     => $this->apartment->id,
            'number' => '1A-Updated',
            'status' => 'reserved',
        ]);
    }

    public function test_apartment_can_be_deleted(): void
    {
        $response = $this->actingAs($this->user)
            ->delete(route('apartments.destroy', $this->apartment));

        $response->assertRedirect();

        $this->assertDatabaseMissing('apartments', [
            'id' => $this->apartment->id,
        ]);
    }

    public function test_apartments_can_be_bulk_generated(): void
    {
        $payload = [
            'building_id'          => $this->building->id,
            'floors'               => 3,
            'apartments_per_floor' => 2,
            'rooms'                => 1,
            'area'                 => 45.00,
            'base_price'           => 30000.00,
            'price_per_floor'      => 1000.00,
            'start_floor'          => 3,
        ];

        $response = $this->actingAs($this->user)
            ->post(route('apartments.bulk-generate'), $payload);

        $response->assertRedirect();

        // 3 floors * 2 apartments = 6 apartments generated
        $this->assertEquals(6, Apartment::where('building_id', $this->building->id)->where('floor', '>=', 3)->count());
    }

    public function test_apartment_details_can_be_retrieved_via_json(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.apartments.detail', $this->apartment));

        $response->assertOk();
        $response->assertJsonStructure([
            'apartment',
            'resident',
            'requests',
            'meters',
            'invoices',
        ]);
    }

    public function test_building_floor_plan_can_be_retrieved_via_json(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('buildings.floor-plan', $this->building));

        $response->assertOk();
        $response->assertJsonStructure([
            'floors',
            'apartments',
            'managers',
        ]);
    }

    public function test_apartment_status_can_be_updated_via_json(): void
    {
        $response = $this->actingAs($this->user)
            ->patch(route('apartments.update-status', $this->apartment), [
                'status' => 'sold',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);
        $this->assertEquals('sold', $this->apartment->fresh()->status);
    }

    public function test_manager_can_be_assigned_to_apartment_via_json(): void
    {
        $client = Client::create([
            'company_id'   => $this->company->id,
            'full_name'    => 'Test Client',
            'apartment_id' => $this->apartment->id,
            'status'       => 'new',
        ]);

        $response = $this->actingAs($this->user)
            ->patch(route('apartments.assign-manager', $this->apartment), [
                'assigned_manager_id' => $this->user->id,
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);
        $this->assertEquals($this->user->id, $client->fresh()->assigned_to);
    }
}
