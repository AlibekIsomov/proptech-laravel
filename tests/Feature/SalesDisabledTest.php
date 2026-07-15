<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SalesDisabledTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $company = Company::firstOrCreate(
            ['slug' => 'proptech-uz'],
            ['name' => '1Mahalla HQ', 'is_active' => true]
        );

        $this->user = User::firstOrCreate(
            ['email' => 'sales-disabled@proptech.uz'],
            [
                'full_name'  => 'Sales Disabled',
                'password'   => Hash::make('password'),
                'company_id' => $company->id,
            ]
        );

        if (!$this->user->hasRole('super_admin')) {
            $this->user->assignRole('super_admin');
        }
    }

    public function test_sales_routes_return_404(): void
    {
        foreach (['/dashboard', '/projects', '/apartments', '/clients', '/companies', '/users'] as $path) {
            $this->actingAs($this->user)->get($path)->assertNotFound();
        }
    }

    public function test_login_redirects_to_pm_login(): void
    {
        $this->get('/login')->assertRedirect(route('pm.login'));
    }

    public function test_login_lands_on_pm_dashboard(): void
    {
        $response = $this->post(route('pm.login.post'), [
            'email'    => $this->user->email,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('pm.dashboard'));
    }
}
