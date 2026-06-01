<?php

namespace Tests\Feature;

use App\Models\Apartment;
use App\Models\Building;
use App\Models\Company;
use App\Models\Project;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ResidentTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;
    protected Apartment $apartment;
    protected Apartment $secondApartment;

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
            'name'       => 'Test Project',
            'city'       => 'Tashkent',
        ]);

        $building = Building::create([
            'project_id' => $project->id,
            'name'       => 'Block A',
        ]);

        $this->apartment = Apartment::create([
            'building_id' => $building->id,
            'floor'       => 1,
            'number'      => '1A',
            'status'      => 'available',
        ]);

        $this->secondApartment = Apartment::create([
            'building_id' => $building->id,
            'floor'       => 1,
            'number'      => '1B',
            'status'      => 'available',
        ]);
    }

    public function test_residents_index_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.residents.index'));

        $response->assertOk();
    }

    public function test_resident_can_be_created(): void
    {
        $payload = [
            'apartment_id'      => $this->apartment->id,
            'full_name'         => 'Eshmat Toshmatov',
            'phone'             => '+998 90 123 45 67',
            'email'             => 'eshmat@example.com',
            'telegram_username' => 'eshmat_dev',
            'resident_type'     => 'tenant',
            'move_in_date'      => '2026-05-29',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('pm.residents.store'), $payload);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('residents', [
            'full_name'    => 'Eshmat Toshmatov',
            'apartment_id' => $this->apartment->id,
            'company_id'   => $this->company->id,
        ]);
    }

    public function test_resident_can_be_updated_including_apartment(): void
    {
        $resident = Resident::create([
            'company_id'    => $this->company->id,
            'apartment_id'  => $this->apartment->id,
            'full_name'     => 'Original Resident Name',
            'resident_type' => 'owner',
            'is_active'     => true,
        ]);

        $payload = [
            'apartment_id'      => $this->secondApartment->id,
            'full_name'         => 'Updated Resident Name',
            'phone'             => '+998 90 999 88 77',
            'email'             => 'updated@example.com',
            'telegram_username' => 'updated_tg',
            'resident_type'     => 'tenant',
            'move_in_date'      => '2026-06-01',
            'is_active'         => true,
        ];

        $response = $this->actingAs($this->user)
            ->put(route('pm.residents.update', $resident), $payload);

        $response->assertRedirect();

        $fresh = $resident->fresh();
        $this->assertEquals('Updated Resident Name', $fresh->full_name);
        $this->assertEquals($this->secondApartment->id, $fresh->apartment_id);
    }

    public function test_resident_can_be_archived(): void
    {
        $resident = Resident::create([
            'company_id'    => $this->company->id,
            'apartment_id'  => $this->apartment->id,
            'full_name'     => 'Archive Candidate',
            'resident_type' => 'family',
            'is_active'     => true,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('pm.residents.destroy', $resident));

        $response->assertRedirect();
        $this->assertFalse($resident->fresh()->is_active);
    }

    public function test_resident_can_be_linked_to_correct_apartment_with_duplicate_number(): void
    {
        // Create another project and building to host a duplicate apartment number
        $secondProject = Project::create([
            'company_id' => $this->company->id,
            'name'       => 'Second Project',
            'city'       => 'Samarkand',
        ]);

        $secondBuilding = Building::create([
            'project_id' => $secondProject->id,
            'name'       => 'Block B',
        ]);

        // Create an apartment with the SAME number '1A' as $this->apartment, but in the second building
        $duplicateApartment = Apartment::create([
            'building_id' => $secondBuilding->id,
            'floor'       => 1,
            'number'      => '1A', // Same number as $this->apartment!
            'status'      => 'available',
        ]);

        // Assert they have different IDs but same number
        $this->assertNotEquals($this->apartment->id, $duplicateApartment->id);
        $this->assertEquals($this->apartment->number, $duplicateApartment->number);

        // Create resident linked to the duplicate apartment
        $payload = [
            'apartment_id'      => $duplicateApartment->id,
            'full_name'         => 'Duplicate Number Resident',
            'resident_type'     => 'owner',
            'move_in_date'      => '2026-05-29',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('pm.residents.store'), $payload);

        $response->assertRedirect();

        // Assert the resident in the database is linked specifically to the duplicate apartment, NOT the original one
        $this->assertDatabaseHas('residents', [
            'full_name'    => 'Duplicate Number Resident',
            'apartment_id' => $duplicateApartment->id,
        ]);

        $this->assertDatabaseMissing('residents', [
            'full_name'    => 'Duplicate Number Resident',
            'apartment_id' => $this->apartment->id,
        ]);
    }
}
