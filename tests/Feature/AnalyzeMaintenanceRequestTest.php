<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeMaintenanceRequest;
use App\Models\Company;
use App\Models\MaintenanceRequest;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PM\Project;
use App\Services\ClaudeService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AnalyzeMaintenanceRequestTest extends TestCase
{
    use DatabaseTransactions;

    private MaintenanceRequest $request;

    protected function setUp(): void
    {
        parent::setUp();

        $company = Company::firstOrCreate(
            ['slug' => 'ai-analyze-test'],
            ['name' => 'AI Analyze Test Co', 'is_active' => true],
        );
        $project = Project::withoutGlobalScopes()->firstOrCreate(
            ['company_id' => $company->id, 'name' => 'AI Test Project'],
        );
        $building = Building::firstOrCreate(['pm_project_id' => $project->id, 'name' => 'AI Test Building']);
        $apartment = Apartment::firstOrCreate(
            ['pm_building_id' => $building->id, 'number' => 'AI-1'],
            ['floor' => 1, 'rooms' => 2, 'area' => 50],
        );

        $this->request = MaintenanceRequest::create([
            'apartment_id' => $apartment->id,
            'company_id' => $company->id,
            'category' => 'plumbing',
            'priority' => 'medium',
            'status' => 'open',
            'title' => 'Kranda suv oqayapti',
            'description' => 'Oshxonada kran tagidan suv sizmoqda.',
        ]);
    }

    public function test_job_fills_ai_fields_from_text_when_no_photo(): void
    {
        $this->mock(ClaudeService::class, function ($mock) {
            $mock->shouldReceive('categorizeRequest')->once()->andReturn([
                'category' => 'plumbing',
                'priority' => 'high',
                'summary' => 'Kran prokladkasi almashtirilishi kerak. Taxminiy narx: 150 000 UZS.',
            ]);
        });

        app()->call([new AnalyzeMaintenanceRequest($this->request->id), 'handle']);

        $fresh = $this->request->fresh();
        $this->assertSame('plumbing', $fresh->ai_category_suggested);
        $this->assertSame('high', $fresh->ai_priority_suggested);
        $this->assertStringContainsString('150 000', $fresh->ai_summary);
    }

    /**
     * AI javob bermasa (kalit yo'q / API xatosi) hech narsa saqlanmasligi kerak —
     * aks holda ariza "tahlil qilingan" ko'rinib qoladi va qayta urinilmaydi.
     */
    public function test_failed_analysis_leaves_ai_fields_untouched(): void
    {
        $this->mock(ClaudeService::class, function ($mock) {
            $mock->shouldReceive('categorizeRequest')->once()->andReturn([]);
        });

        app()->call([new AnalyzeMaintenanceRequest($this->request->id), 'handle']);

        $fresh = $this->request->fresh();
        $this->assertNull($fresh->ai_summary);
        $this->assertNull($fresh->ai_category_suggested);
        $this->assertNull($fresh->ai_priority_suggested);
    }

    public function test_force_reanalyzes_an_already_analyzed_request(): void
    {
        $this->request->updateQuietly(['ai_summary' => 'Eski tahlil.']);

        $this->mock(ClaudeService::class, function ($mock) {
            $mock->shouldReceive('categorizeRequest')->once()->andReturn([
                'category' => 'plumbing',
                'priority' => 'emergency',
                'summary' => 'Yangi tahlil.',
            ]);
        });

        app()->call([new AnalyzeMaintenanceRequest($this->request->id, force: true), 'handle']);

        $this->assertSame('Yangi tahlil.', $this->request->fresh()->ai_summary);
    }

    public function test_job_skips_already_analyzed_request(): void
    {
        $this->request->updateQuietly(['ai_summary' => 'Allaqachon tahlil qilingan.']);

        $this->mock(ClaudeService::class, function ($mock) {
            $mock->shouldNotReceive('categorizeRequest');
            $mock->shouldNotReceive('analyzeMaintenancePhoto');
        });

        app()->call([new AnalyzeMaintenanceRequest($this->request->id), 'handle']);

        $this->assertSame('Allaqachon tahlil qilingan.', $this->request->fresh()->ai_summary);
    }
}
