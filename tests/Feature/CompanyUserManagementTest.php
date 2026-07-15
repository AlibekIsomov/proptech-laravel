<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CompanyUserManagementTest extends TestCase
{
    use DatabaseTransactions;

    protected User $superAdmin;
    protected User $companyAdmin1;
    protected User $companyAdmin2;
    protected Company $company1;
    protected Company $company2;

    protected function setUp(): void
    {
        parent::setUp();

        // Users/Companies routelari ham sales.disabled ostida (404) — SalesDisabledTest ga qarang
        $this->markTestSkipped('Sales portal disabled — routes return 404');

        $this->company1 = Company::firstOrCreate(
            ['slug' => 'company-one'],
            ['name' => 'Company One', 'is_active' => true]
        );

        $this->company2 = Company::firstOrCreate(
            ['slug' => 'company-two'],
            ['name' => 'Company Two', 'is_active' => true]
        );

        $this->superAdmin = User::firstOrCreate(
            ['email' => 'super-admin@proptech.uz'],
            [
                'full_name'  => 'Super Admin',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company1->id,
            ]
        );
        if (!$this->superAdmin->hasRole('super_admin')) {
            $this->superAdmin->assignRole('super_admin');
        }

        $this->companyAdmin1 = User::firstOrCreate(
            ['email' => 'admin-c1@proptech.uz'],
            [
                'full_name'  => 'Company Admin 1',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company1->id,
            ]
        );
        if (!$this->companyAdmin1->hasRole('company_admin')) {
            $this->companyAdmin1->assignRole('company_admin');
        }

        $this->companyAdmin2 = User::firstOrCreate(
            ['email' => 'admin-c2@proptech.uz'],
            [
                'full_name'  => 'Company Admin 2',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company2->id,
            ]
        );
        if (!$this->companyAdmin2->hasRole('company_admin')) {
            $this->companyAdmin2->assignRole('company_admin');
        }
    }

    public function test_super_admin_can_create_user_with_specific_company(): void
    {
        $payload = [
            'full_name'  => 'Employee C2',
            'email'      => 'emp-c2@proptech.uz',
            'password'   => 'password123',
            'role'       => 'manager',
            'company_id' => $this->company2->id,
        ];

        $response = $this->actingAs($this->superAdmin)
            ->post(route('users.store'), $payload);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('users', [
            'email'      => 'emp-c2@proptech.uz',
            'company_id' => $this->company2->id,
        ]);
    }

    public function test_company_admin_can_create_user_without_sending_company_id(): void
    {
        $payload = [
            'full_name'  => 'Employee C1',
            'email'      => 'emp-c1@proptech.uz',
            'password'   => 'password123',
            'role'       => 'manager',
        ];

        $response = $this->actingAs($this->companyAdmin1)
            ->post(route('users.store'), $payload);

        $response->assertRedirect();
        
        // Assert it was created and automatically assigned to companyAdmin1's company
        $this->assertDatabaseHas('users', [
            'email'      => 'emp-c1@proptech.uz',
            'company_id' => $this->company1->id,
        ]);
    }

    public function test_company_admin_cannot_assign_super_admin_role(): void
    {
        $payload = [
            'full_name'  => 'Hacker User',
            'email'      => 'hacker@proptech.uz',
            'password'   => 'password123',
            'role'       => 'super_admin',
        ];

        $response = $this->actingAs($this->companyAdmin1)
            ->post(route('users.store'), $payload);

        $response->assertStatus(403);
    }

    public function test_company_admin_cannot_update_users_from_another_company(): void
    {
        $userInC2 = User::create([
            'full_name'  => 'C2 Employee',
            'email'      => 'c2-emp@proptech.uz',
            'password'   => 'password123',
            'company_id' => $this->company2->id,
        ]);

        $payload = [
            'full_name'  => 'Malicious Update',
            'email'      => 'c2-emp-hacked@proptech.uz',
            'role'       => 'manager',
        ];

        $response = $this->actingAs($this->companyAdmin1)
            ->put(route('users.update', $userInC2), $payload);

        $response->assertStatus(403);
    }

    public function test_company_admin_cannot_delete_users_from_another_company(): void
    {
        $userInC2 = User::create([
            'full_name'  => 'C2 Employee',
            'email'      => 'c2-emp-delete@proptech.uz',
            'password'   => 'password123',
            'company_id' => $this->company2->id,
        ]);

        $response = $this->actingAs($this->companyAdmin1)
            ->delete(route('users.destroy', $userInC2));

        $response->assertStatus(403);
    }

    public function test_company_admin_does_not_see_super_admin_role_in_list(): void
    {
        $response = $this->actingAs($this->companyAdmin1)
            ->get(route('users.index'));

        $response->assertOk();
        $roles = $response->inertiaPage()['props']['roles'] ?? [];
        
        $roleNames = collect($roles)->pluck('name');
        $this->assertFalse($roleNames->contains('super_admin'));
    }
}
