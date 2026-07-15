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

class SalesClientTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $manager1;
    protected User $manager2;
    protected Company $company;
    protected Project $project;
    protected Building $building;
    protected Apartment $apartment;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        // Savdo portali o'chirilgan (sales.disabled → 404) — SalesDisabledTest ga qarang
        $this->markTestSkipped('Sales portal disabled — routes return 404');

        $this->company = Company::firstOrCreate(
            ['slug' => 'proptech-uz'],
            ['name' => '1Mahalla HQ', 'is_active' => true]
        );

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@proptech.uz'],
            [
                'full_name'  => 'Super Admin',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company->id,
            ]
        );

        if (!$this->admin->hasRole('super_admin')) {
            $this->admin->assignRole('super_admin');
        }

        $this->manager1 = User::firstOrCreate(
            ['email' => 'manager1@proptech.uz'],
            [
                'full_name'  => 'Sales Manager 1',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company->id,
            ]
        );

        if (!$this->manager1->hasRole('manager')) {
            $this->manager1->assignRole('manager');
        }

        $this->manager2 = User::firstOrCreate(
            ['email' => 'manager2@proptech.uz'],
            [
                'full_name'  => 'Sales Manager 2',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company->id,
            ]
        );

        if (!$this->manager2->hasRole('manager')) {
            $this->manager2->assignRole('manager');
        }

        $this->project = Project::create([
            'company_id' => $this->company->id,
            'name'       => 'Test Client Project',
            'location'   => 'Tashkent',
        ]);

        $this->building = Building::create([
            'project_id' => $this->project->id,
            'name'       => 'Block A',
        ]);

        $this->apartment = Apartment::create([
            'building_id' => $this->building->id,
            'floor'       => 1,
            'number'      => '1C',
            'rooms'       => 2,
            'area'        => 55.00,
            'price'       => 45000.00,
            'status'      => 'available',
        ]);

        $this->client = Client::create([
            'company_id'   => $this->company->id,
            'assigned_to'  => $this->manager1->id,
            'full_name'    => 'John Doe',
            'phone'        => '+998901234567',
            'email'        => 'john@example.com',
            'status'       => 'new',
            'budget_usd'   => 50000.00,
            'source'       => 'website',
            'apartment_id' => $this->apartment->id,
        ]);
    }

    public function test_clients_list_can_be_rendered(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('clients.index'));

        $response->assertOk();
    }

    public function test_manager_can_only_see_their_own_clients(): void
    {
        // manager1 should see the client
        $response1 = $this->actingAs($this->manager1)
            ->get(route('clients.index'));
        $response1->assertOk();
        
        $props1 = $response1->inertiaPage()['props'] ?? [];
        $clients1 = $props1['clients'] ?? [];
        $this->assertCount(1, $clients1);

        // manager2 should not see the client
        $response2 = $this->actingAs($this->manager2)
            ->get(route('clients.index'));
        $response2->assertOk();
        
        $props2 = $response2->inertiaPage()['props'] ?? [];
        $clients2 = $props2['clients'] ?? [];
        $this->assertCount(0, $clients2);
    }

    public function test_client_can_be_created(): void
    {
        $payload = [
            'full_name'    => 'Alice Smith',
            'phone'        => '+998901112233',
            'email'        => 'alice@example.com',
            'status'       => 'contacted',
            'budget_usd'   => 60000.00,
            'source'       => 'instagram',
            'notes'        => 'Looking for 2br',
            'assigned_to'  => $this->manager1->id,
            'apartment_id' => $this->apartment->id,
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('clients.store'), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('clients', [
            'full_name' => 'Alice Smith',
            'email'     => 'alice@example.com',
        ]);
    }

    public function test_client_can_be_updated_and_syncs_apartment_status(): void
    {
        // First test reserving
        $payload = [
            'full_name'    => 'John Doe Updated',
            'phone'        => '+998901234567',
            'email'        => 'john@example.com',
            'status'       => 'reserved',
            'budget_usd'   => 50000.00,
            'source'       => 'website',
            'apartment_id' => $this->apartment->id,
        ];

        $response = $this->actingAs($this->admin)
            ->put(route('clients.update', $this->client), $payload);

        $response->assertRedirect();
        $this->assertEquals('reserved', $this->apartment->fresh()->status);

        // Then test buying
        $payload['status'] = 'bought';
        $response = $this->actingAs($this->admin)
            ->put(route('clients.update', $this->client), $payload);

        $response->assertRedirect();
        $this->assertEquals('sold', $this->apartment->fresh()->status);
    }

    public function test_client_can_be_deleted(): void
    {
        $response = $this->actingAs($this->admin)
            ->delete(route('clients.destroy', $this->client));

        $response->assertRedirect();

        $this->assertDatabaseMissing('clients', [
            'id' => $this->client->id,
        ]);
    }

    public function test_ai_email_can_be_generated(): void
    {
        $payload = [
            'client_name'    => 'John Doe',
            'apartment_info' => 'Apt 1C',
            'context'        => 'Negotiating price',
        ];

        $response = $this->actingAs($this->manager1)
            ->post(route('ai.email'), $payload);

        $response->assertOk();
        $response->assertJsonStructure([
            'email',
        ]);
    }
}
