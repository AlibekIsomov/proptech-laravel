<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Apartment;
use App\Models\Building;
use App\Models\Project;
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
            'project_id' => $b->project_id,
            'name'       => $b->name,
            'created_at' => $b->created_at->format('Y-m-d'),
        ]);

        $stats = Apartment::whereIn('building_id', $buildings->pluck('id'))
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
            'project_id' => $project->id,
            'name'       => $data['name'],
            'monthly_fee_per_sqm' => $data['monthly_fee_per_sqm'] ?? 0,
        ]);

        return back()->with('success', 'Bino qo\'shildi.');
    }
}
