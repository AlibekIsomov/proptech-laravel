<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SalesDashboardTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;

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
            ['email' => 'sales-manager@proptech.uz'],
            [
                'full_name'  => 'Sales Manager',
                'password'   => \Illuminate\Support\Facades\Hash::make('password'),
                'company_id' => $this->company->id,
            ]
        );

        if (!$this->user->hasRole('manager')) {
            $this->user->assignRole('manager');
        }
    }

    public function test_dashboard_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('dashboard'));

        $response->assertOk();
    }

    public function test_ai_insights_can_be_retrieved(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('ai.insights'));

        $response->assertOk();
        $response->assertJsonStructure([
            'insights',
        ]);
    }
}
