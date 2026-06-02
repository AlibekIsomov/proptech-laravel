<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PM\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        $projects = Project::withCount(['buildings', 'apartments'])
            ->latest()
            ->get()
            ->map(fn($p) => [
                'id'               => $p->id,
                'name'             => $p->name,
                'location'         => $p->location,
                'status'           => $p->status,
                'buildings_count'  => $p->buildings_count,
                'apartments_count' => $p->apartments_count,
                'created_at'       => $p->created_at->format('Y-m-d'),
            ]);

        return Inertia::render('PM/Projects/Index', ['projects' => $projects]);
    }

    public function show(Project $project): Response
    {
        $buildings = $project->buildings()->orderBy('created_at')->get()->map(fn($b) => [
            'id'         => $b->id,
            'pm_project_id' => $b->pm_project_id,
            'name'       => $b->name,
            'created_at' => $b->created_at->format('Y-m-d'),
        ]);

        $buildingIds = $buildings->pluck('id');

        $totalCounts = Apartment::whereIn('pm_building_id', $buildingIds)
            ->selectRaw('pm_building_id, count(*) as total')
            ->groupBy('pm_building_id')
            ->get()
            ->keyBy('pm_building_id');

        $occupiedCounts = Apartment::whereIn('pm_building_id', $buildingIds)
            ->whereHas('residents', fn ($q) => $q->where('is_active', true))
            ->selectRaw('pm_building_id, count(*) as occupied')
            ->groupBy('pm_building_id')
            ->get()
            ->keyBy('pm_building_id');

        $stats = $buildingIds->mapWithKeys(function ($id) use ($totalCounts, $occupiedCounts) {
            $total    = (int) ($totalCounts[$id]->total ?? 0);
            $occupied = (int) ($occupiedCounts[$id]->occupied ?? 0);
            return [$id => [
                'total'     => $total,
                'available' => $total - $occupied,
                'sold'      => $occupied,
                'reserved'  => 0,
            ]];
        });

        return Inertia::render('PM/Projects/Show', [
            'project' => [
                'id'         => $project->id,
                'name'       => $project->name,
                'location'   => $project->location,
                'status'     => $project->status,
                'created_at' => $project->created_at->format('Y-m-d'),
            ],
            'buildings' => $buildings,
            'aptStats'  => $stats,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'status'   => ['required', 'in:active,completed,paused'],
        ]);

        $data['company_id'] = auth()->user()->company_id;
        Project::create($data);

        return back()->with('success', 'Loyiha yaratildi.');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'status'   => ['required', 'in:active,completed,paused'],
        ]);

        $project->update($data);

        return back()->with('success', 'Loyiha yangilandi.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();
        return back()->with('success', "Loyiha o'chirildi.");
    }

    public function storeBuilding(Request $request, Project $project): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'monthly_fee_per_sqm' => 'nullable|numeric|min:0',
        ]);

        Building::create([
            'pm_project_id' => $project->id,
            'name'       => $data['name'],
            'monthly_fee_per_sqm' => $data['monthly_fee_per_sqm'] ?? 0,
        ]);

        return back()->with('success', 'Bino qo\'shildi.');
    }
}


