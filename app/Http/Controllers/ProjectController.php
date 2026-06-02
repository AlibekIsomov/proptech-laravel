<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Building;
use App\Models\Apartment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        $projects = Project::with(['buildings'])
            ->withCount(['buildings', 'apartments'])
            ->latest()
            ->get()
            ->map(fn ($p) => [
                'id'               => $p->id,
                'name'             => $p->name,
                'location'         => $p->location,
                'status'           => $p->status,
                'buildings_count'  => $p->buildings_count,
                'apartments_count' => $p->apartments_count,
                'created_at'       => $p->created_at->format('Y-m-d'),
            ]);

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'description'     => ['nullable', 'string'],
            'location'        => ['nullable', 'string', 'max:255'],
            'status'          => ['required', 'in:active,completed,paused'],
            'total_area'      => ['nullable', 'numeric', 'min:0'],
            'total_floors'    => ['nullable', 'integer', 'min:1'],
            'start_date'      => ['nullable', 'date'],
            'completion_date' => ['nullable', 'date'],
        ]);

        $data['company_id'] = auth()->user()->company_id;

        Project::create($data);

        return back()->with('success', 'Loyiha muvaffaqiyatli yaratildi.');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'description'     => ['nullable', 'string'],
            'location'        => ['nullable', 'string', 'max:255'],
            'status'          => ['required', 'in:active,completed,paused'],
            'total_area'      => ['nullable', 'numeric', 'min:0'],
            'total_floors'    => ['nullable', 'integer', 'min:1'],
            'start_date'      => ['nullable', 'date'],
            'completion_date' => ['nullable', 'date'],
        ]);

        $project->update($data);

        return back()->with('success', 'Loyiha yangilandi.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();
        return back()->with('success', 'Loyiha o\'chirildi.');
    }

    /**
     * Display the project details including buildings and floor plan
     */
    public function show(Project $project): Response
    {
        $project->load(['buildings']);

        $buildings = $project->buildings()->orderBy('created_at')->get()->map(fn($b) => [
            'id' => $b->id,
            'project_id' => $b->project_id,
            'name' => $b->name,
            'created_at' => $b->created_at->format('Y-m-d'),
        ]);

        $aptStats = Apartment::whereIn('building_id', $buildings->pluck('id'))
            ->selectRaw("building_id,
                count(*) as total,
                sum(case when status='available' then 1 else 0 end) as available,
                sum(case when status='sold'      then 1 else 0 end) as sold,
                sum(case when status='reserved'  then 1 else 0 end) as reserved")
            ->groupBy('building_id')
            ->get()
            ->keyBy('building_id')
            ->map(fn($r) => [
                'total'     => (int) $r->total,
                'available' => (int) $r->available,
                'sold'      => (int) $r->sold,
                'reserved'  => (int) $r->reserved,
            ]);

        return Inertia::render('Projects/Show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'location' => $project->location,
                'created_at' => $project->created_at->format('Y-m-d'),
            ],
            'buildings' => $buildings,
            'aptStats'  => $aptStats,
        ]);
    }

    /**
     * Store a newly created building in storage
     */
    public function storeBuilding(Request $request): \Illuminate\Http\RedirectResponse
    {
        $data = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'name' => 'required|string|max:255',
            'monthly_fee_per_sqm' => 'nullable|numeric|min:0',
        ]);

        Building::create($data);

        return back()->with('success', 'Здание успешно добавлено.');
    }
}
