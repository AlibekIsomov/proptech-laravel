<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Company;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SalesProjectTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        // Savdo portali o'chirilgan (sales.disabled → 404) — SalesDisabledTest ga qarang
        $this->markTestSkipped('Sales portal disabled — routes return 404');

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
            'name'       => 'Test Sales Project',
            'location'   => 'Tashkent',
            'status'     => 'active',
        ]);
    }

    public function test_projects_list_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('projects.index'));

        $response->assertOk();
    }

    public function test_project_can_be_created(): void
    {
        $payload = [
            'name'            => 'New Project Name',
            'description'     => 'Description of new project',
            'location'        => 'Samarkand',
            'status'          => 'active',
            'total_area'      => 1200.50,
            'total_floors'    => 10,
            'start_date'      => '2026-06-01',
            'completion_date' => '2027-06-01',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('projects.store'), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'name'     => 'New Project Name',
            'location' => 'Samarkand',
        ]);
    }

    public function test_project_can_be_updated(): void
    {
        $payload = [
            'name'            => 'Updated Project Name',
            'location'        => 'Bukhara',
            'status'          => 'completed',
        ];

        $response = $this->actingAs($this->user)
            ->put(route('projects.update', $this->project), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'id'       => $this->project->id,
            'name'     => 'Updated Project Name',
            'location' => 'Bukhara',
            'status'   => 'completed',
        ]);
    }

    public function test_project_can_be_deleted(): void
    {
        $response = $this->actingAs($this->user)
            ->delete(route('projects.destroy', $this->project));

        $response->assertRedirect();

        $this->assertDatabaseMissing('projects', [
            'id' => $this->project->id,
        ]);
    }

    public function test_project_details_can_be_rendered(): void
    {
        $building = Building::create([
            'project_id' => $this->project->id,
            'name'       => 'Block B',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('projects.show', $this->project));

        $response->assertOk();
    }

    public function test_building_can_be_added_to_project(): void
    {
        $payload = [
            'project_id' => $this->project->id,
            'name'       => 'Block C',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('buildings.store'), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('buildings', [
            'project_id' => $this->project->id,
            'name'       => 'Block C',
        ]);
    }
}
