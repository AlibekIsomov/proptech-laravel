<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\MaintenanceRequest;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PM\Project;
use App\Models\Resident;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RepeatDetectionTest extends TestCase
{
    use DatabaseTransactions;

    private Apartment $apartment;

    private Resident $resident;

    private Vendor $vendor;

    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();

        $this->company = Company::firstOrCreate(
            ['slug' => 'repeat-test'],
            ['name' => 'Repeat Test Co', 'is_active' => true],
        );

        $project = Project::withoutGlobalScopes()->firstOrCreate(
            ['company_id' => $this->company->id, 'name' => 'Repeat Test Project'],
        );
        $building = Building::firstOrCreate(
            ['pm_project_id' => $project->id, 'name' => 'Repeat Test Building'],
        );
        $this->apartment = Apartment::firstOrCreate(
            ['pm_building_id' => $building->id, 'number' => 'RT-1'],
            ['floor' => 1, 'rooms' => 2, 'area' => 50],
        );
        $this->resident = Resident::withoutGlobalScopes()->firstOrCreate(
            ['company_id' => $this->company->id, 'apartment_id' => $this->apartment->id, 'full_name' => 'Repeat Tester'],
        );
        $this->vendor = Vendor::withoutGlobalScopes()->firstOrCreate(
            ['company_id' => $this->company->id, 'name' => 'Repeat Test Vendor'],
            ['phone' => '+998900000000', 'specializations' => ['plumbing']],
        );
    }

    private function makeApartment(string $number): Apartment
    {
        return Apartment::firstOrCreate(
            ['pm_building_id' => $this->apartment->pm_building_id, 'number' => $number],
            ['floor' => 1, 'rooms' => 2, 'area' => 50],
        );
    }

    private function makeCompleted(int $daysAgo, int $rating = 5, ?Apartment $apartment = null): MaintenanceRequest
    {
        $apartment ??= $this->apartment;

        return MaintenanceRequest::create([
            'apartment_id' => $apartment->id,
            'building_id' => $this->apartment->pm_building_id,
            'company_id' => $this->company->id,
            'resident_id' => $this->resident->id,
            'category' => 'plumbing',
            'priority' => 'medium',
            'status' => 'completed',
            'title' => 'Kranda suv oqayapti',
            'description' => 'Test',
            'assigned_vendor_id' => $this->vendor->id,
            'resident_rating' => $rating,
            'completed_at' => now()->subDays($daysAgo),
        ]);
    }

    private function makeNew(?Apartment $apartment = null): MaintenanceRequest
    {
        $apartment ??= $this->apartment;

        return MaintenanceRequest::create([
            'apartment_id' => $apartment->id,
            'building_id' => $this->apartment->pm_building_id,
            'company_id' => $this->company->id,
            'resident_id' => $this->resident->id,
            'category' => 'plumbing',
            'priority' => 'medium',
            'status' => 'open',
            'title' => 'Yana kran oqayapti',
            'description' => 'Test',
        ]);
    }

    public function test_repeat_within_window_is_linked_and_vendor_penalized(): void
    {
        $original = $this->makeCompleted(daysAgo: 21);
        $this->vendor->recalculateRating();
        $this->assertEquals(5.00, (float) $this->vendor->fresh()->rating);

        $repeat = $this->makeNew();

        $this->assertSame($original->id, $repeat->fresh()->repeat_of_id);
        // rating = avg(5) - 2 × (1 takror / (1 yakunlangan + 5 vazn)) = 4.67
        $this->assertEquals(4.67, (float) $this->vendor->fresh()->rating);
    }

    /**
     * Bitta omadsiz ish yangi ustani qora ro'yxatga tushirmasligi, lekin takrorlar
     * to'planganda jarima sezilarli bo'lishi kerak.
     */
    public function test_penalty_grows_with_repeated_failures(): void
    {
        // Har juftlik alohida kvartirada — aks holda yakunlangan ta'mirlar
        // bir-birining takroriga aylanib, hisobni buzadi
        for ($i = 0; $i < 6; $i++) {
            $apartment = $this->makeApartment("RT-P{$i}");
            $this->makeCompleted(daysAgo: 21, apartment: $apartment);
            $this->makeNew($apartment);
        }

        $rating = (float) $this->vendor->fresh()->rating;

        // 6 takror / (6 yakunlangan + 5 vazn) = 0.545 -> 5 - 1.09 = 3.91
        $this->assertEqualsWithDelta(3.91, $rating, 0.01);
    }

    public function test_old_completion_outside_window_is_not_a_repeat(): void
    {
        $this->makeCompleted(daysAgo: 90);

        $this->assertNull($this->makeNew()->fresh()->repeat_of_id);
    }

    public function test_different_category_is_not_a_repeat(): void
    {
        $this->makeCompleted(daysAgo: 10);

        $request = MaintenanceRequest::create([
            'apartment_id' => $this->apartment->id,
            'company_id' => $this->company->id,
            'category' => 'electrical',
            'priority' => 'medium',
            'status' => 'open',
            'title' => 'Rozetka ishlamayapti',
            'description' => 'Test',
        ]);

        $this->assertNull($request->fresh()->repeat_of_id);
    }
}
