<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Company;
use App\Models\InventoryItem;
use App\Models\PMAsset;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Company $company;
    protected Building $building;

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

        $project = Project::create([
            'company_id' => $this->company->id,
            'name'       => 'Test Project',
            'city'       => 'Tashkent',
        ]);

        $this->building = Building::create([
            'project_id' => $project->id,
            'name'       => 'Block A',
        ]);
    }

    public function test_inventory_page_can_be_rendered(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('pm.inventory.index'));

        $response->assertOk();
    }

    public function test_equipment_assets_list_can_be_queried(): void
    {
        $asset = PMAsset::create([
            'building_id'           => $this->building->id,
            'name'                  => 'Main Elevator',
            'category'              => 'elevator',
            'status'                => 'operational',
            'serial_number'         => 'SN-ELEV-1',
            'installed_at'          => '2026-01-01',
            'warranty_until'        => '2027-01-01',
            'service_interval_days' => 30,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('pm.inventory.index', ['building_id' => $this->building->id]));

        $response->assertOk();
        $response->assertJsonFragment([
            'name'          => 'Main Elevator',
            'serial_number' => 'SN-ELEV-1',
        ]);
    }

    public function test_consumable_supplies_list_can_be_queried(): void
    {
        $item = InventoryItem::create([
            'company_id'    => $this->company->id,
            'building_id'   => $this->building->id,
            'name'          => 'LED Bulb E27',
            'category'      => 'Electrical',
            'quantity'      => 100,
            'unit'          => 'pcs',
            'min_threshold' => 10,
            'unit_cost'     => 1.50,
            'supplier'      => 'ElektoSnab',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('pm.inventory.index', ['building_id' => $this->building->id, 'type' => 'supply']));

        $response->assertOk();
        $response->assertJsonFragment([
            'name'     => 'LED Bulb E27',
            'quantity' => 100,
        ]);
    }

    public function test_equipment_asset_can_be_created(): void
    {
        $payload = [
            'building_id'           => $this->building->id,
            'name'                  => 'Water Pump Wilo',
            'category'              => 'pump',
            'status'                => 'operational',
            'serial_number'         => 'SN-PUMP-99',
            'manufacturer'          => 'Wilo SE',
            'location'              => 'Basement',
            'installed_at'          => '2026-05-29',
            'service_interval_days' => 180,
        ];

        $response = $this->actingAs($this->user)
            ->post(route('pm.inventory.store'), $payload);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('pm_assets', [
            'name'          => 'Water Pump Wilo',
            'serial_number' => 'SN-PUMP-99',
            'building_id'   => $this->building->id,
        ]);
    }

    public function test_consumable_supply_can_be_created(): void
    {
        $payload = [
            'type'          => 'supply',
            'building_id'   => $this->building->id,
            'name'          => 'Plumbing Pipe 1/2 inch',
            'category'      => 'Plumbing',
            'quantity'      => 50,
            'unit'          => 'meters',
            'min_threshold' => 5,
            'unit_cost'     => 4.50,
            'supplier'      => 'PipeDepot',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('pm.inventory.store'), $payload);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('inventory_items', [
            'name'        => 'Plumbing Pipe 1/2 inch',
            'quantity'    => 50,
            'unit'        => 'meters',
            'building_id' => $this->building->id,
            'company_id'  => $this->company->id,
        ]);
    }

    public function test_equipment_asset_can_be_updated_and_deleted(): void
    {
        $asset = PMAsset::create([
            'building_id' => $this->building->id,
            'name'        => 'Old Pump',
            'category'    => 'pump',
            'status'      => 'broken',
        ]);

        // Update
        $response = $this->actingAs($this->user)
            ->put(route('pm.inventory.update', $asset), [
                'name'                  => 'Repaired Pump',
                'category'              => 'pump',
                'status'                => 'operational',
                'serial_number'         => null,
                'manufacturer'          => null,
                'location'              => null,
                'installed_at'          => null,
                'warranty_until'        => null,
                'next_service_at'       => null,
                'service_interval_days' => null,
                'notes'                 => null,
            ]);

        $response->assertOk();
        $this->assertEquals('operational', $asset->fresh()->status);
        $this->assertEquals('Repaired Pump', $asset->fresh()->name);

        // Delete
        $response = $this->actingAs($this->user)
            ->delete(route('pm.inventory.destroy', $asset));

        $response->assertOk();
        $this->assertNull(PMAsset::find($asset->id));
    }

    public function test_consumable_supply_can_be_updated_and_deleted(): void
    {
        $item = InventoryItem::create([
            'company_id'    => $this->company->id,
            'building_id'   => $this->building->id,
            'name'          => 'Old Wire',
            'quantity'      => 10,
            'unit'          => 'meters',
        ]);

        // Update
        $response = $this->actingAs($this->user)
            ->put(route('pm.inventory.update', $item), [
                'type'          => 'supply',
                'name'          => 'Thick Copper Wire',
                'category'      => 'Electrical',
                'quantity'      => 80,
                'unit'          => 'meters',
                'min_threshold' => 10,
                'unit_cost'     => 2.75,
                'supplier'      => 'WireMax',
                'notes'         => 'Heavy duty',
            ]);

        $response->assertOk();
        $fresh = $item->fresh();
        $this->assertEquals('Thick Copper Wire', $fresh->name);
        $this->assertEquals(80, $fresh->quantity);

        // Delete
        $response = $this->actingAs($this->user)
            ->delete(route('pm.inventory.destroy', $item));

        $response->assertOk();
        $this->assertNull(InventoryItem::find($item->id));
    }
}
