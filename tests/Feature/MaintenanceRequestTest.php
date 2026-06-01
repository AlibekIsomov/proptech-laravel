<?php

namespace Tests\Feature;

use App\Models\Apartment;
use App\Models\Building;
use App\Models\Company;
use App\Models\MaintenanceRequest;
use App\Models\Project;
use App\Models\Resident;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class MaintenanceRequestTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;
    protected Apartment $apartment;
    protected Resident $resident;
    protected Vendor $vendor;

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

        $this->resident = Resident::create([
            'company_id'    => $this->company->id,
            'apartment_id'  => $this->apartment->id,
            'full_name'     => 'Jane Doe',
            'resident_type' => 'tenant',
            'is_active'     => true,
        ]);

        $this->vendor = Vendor::create([
            'company_id'      => $this->company->id,
            'name'            => 'Super Plumber UZ',
            'phone'           => '+998 90 777 66 55',
            'specializations' => ['plumbing'],
            'is_active'       => true,
        ]);
    }

    public function test_requests_index_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.requests.index'));

        $response->assertOk();
    }

    public function test_ticket_can_be_created_manually_without_vendor(): void
    {
        $payload = [
            'apartment_id' => $this->apartment->id,
            'resident_id'  => $this->resident->id,
            'category'     => 'plumbing',
            'priority'     => 'high',
            'title'        => 'Kitchen sink is clogged',
            'description'  => 'Water is overflowing from the kitchen sink.',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('pm.requests.store'), $payload);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('maintenance_requests', [
            'title'        => 'Kitchen sink is clogged',
            'apartment_id' => $this->apartment->id,
            'resident_id'  => $this->resident->id,
            'status'       => 'open',
        ]);
    }

    public function test_ticket_can_be_created_manually_with_immediate_vendor(): void
    {
        $payload = [
            'apartment_id'       => $this->apartment->id,
            'resident_id'        => $this->resident->id,
            'assigned_vendor_id' => $this->vendor->id,
            'category'           => 'plumbing',
            'priority'           => 'emergency',
            'title'              => 'Burst pipe in bathroom',
            'description'        => 'Water is spraying everywhere in the bathroom.',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('pm.requests.store'), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('maintenance_requests', [
            'title'              => 'Burst pipe in bathroom',
            'assigned_vendor_id' => $this->vendor->id,
            'status'             => 'assigned',
        ]);

        $request = MaintenanceRequest::where('title', 'Burst pipe in bathroom')->first();
        $this->assertNotNull($request->assigned_at);
    }

    public function test_ticket_status_and_timestamps_workflow(): void
    {
        $ticket = MaintenanceRequest::create([
            'company_id'   => $this->company->id,
            'apartment_id' => $this->apartment->id,
            'resident_id'  => $this->resident->id,
            'priority'     => 'medium',
            'title'        => 'Initial Ticket',
            'description'  => 'Some description',
            'status'       => 'open',
        ]);

        // 1. Progress to assigned
        $response = $this->actingAs($this->user)
            ->put(route('pm.requests.update', $ticket), [
                'status'             => 'assigned',
                'assigned_vendor_id' => $this->vendor->id,
                'priority'           => 'medium',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();
        $ticket = $ticket->fresh();
        $this->assertEquals('assigned', $ticket->status);
        $this->assertNotNull($ticket->assigned_at);

        // 2. Progress to in_progress
        $response = $this->actingAs($this->user)
            ->put(route('pm.requests.update', $ticket), [
                'status'             => 'in_progress',
                'assigned_vendor_id' => $this->vendor->id,
                'priority'           => 'medium',
            ]);
        $response->assertRedirect();
        $ticket = $ticket->fresh();
        $this->assertEquals('in_progress', $ticket->status);
        $this->assertNotNull($ticket->started_at);

        // 3. Complete job
        $response = $this->actingAs($this->user)
            ->put(route('pm.requests.update', $ticket), [
                'status'             => 'completed',
                'assigned_vendor_id' => $this->vendor->id,
                'priority'           => 'medium',
                'resolution_notes'   => 'Fixed the issue',
                'cost_amount'        => 50.00,
            ]);
        $response->assertRedirect();
        $ticket = $ticket->fresh();
        $this->assertEquals('completed', $ticket->status);
        $this->assertNotNull($ticket->completed_at);
        $this->assertEquals(50.00, (float)$ticket->cost_amount);
    }
}
