<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class VendorTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::firstOrCreate(
            ['slug' => 'proptech-uz'],
            ['name' => 'PropTech UZ HQ', 'is_active' => true]
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
    }

    public function test_vendors_index_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.vendors.index'));

        $response->assertOk();
    }

    public function test_vendor_can_be_created(): void
    {
        $payload = [
            'name'            => 'Master Electrician UZ',
            'phone'           => '+998 90 111 22 33',
            'email'           => 'electrician@example.com',
            'telegram_username'=> 'master_elec',
            'specializations'  => ['electrical', 'hvac'],
            'notes'            => 'Good emergency responder',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('pm.vendors.store'), $payload);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('vendors', [
            'name'       => 'Master Electrician UZ',
            'phone'      => '+998 90 111 22 33',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_vendor_can_be_updated(): void
    {
        $vendor = Vendor::create([
            'company_id'      => $this->company->id,
            'name'            => 'Original Vendor Name',
            'phone'           => '+998 90 123 45 67',
            'specializations' => ['cleaning'],
            'is_active'       => true,
        ]);

        $payload = [
            'name'            => 'Updated Vendor Name',
            'phone'           => '+998 90 777 88 99',
            'email'           => 'updated_vendor@example.com',
            'telegram_username'=> 'updated_vendor_tg',
            'specializations'  => ['cleaning', 'plumbing'],
            'is_active'        => false,
            'notes'            => 'Now retired',
        ];

        $response = $this->actingAs($this->user)
            ->put(route('pm.vendors.update', $vendor), $payload);

        $response->assertRedirect();

        $fresh = $vendor->fresh();
        $this->assertEquals('Updated Vendor Name', $fresh->name);
        $this->assertFalse($fresh->is_active);
    }

    public function test_vendor_can_be_deleted(): void
    {
        $vendor = Vendor::create([
            'company_id'      => $this->company->id,
            'name'            => 'Delete Candidate',
            'phone'           => '+998 90 555 44 33',
            'specializations' => ['other'],
            'is_active'       => true,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('pm.vendors.destroy', $vendor));

        $response->assertRedirect();
        $this->assertNull(Vendor::find($vendor->id));
    }
}
