<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\PM\Apartment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

use App\Models\PM\Project;
use App\Models\PM\Building;

class ResidentController extends Controller
{
    public function index(): Response
    {
        $residents = Resident::with(['apartment.building.project'])
            ->where('is_active', true)
            ->get()
            ->map(fn ($r) => [
                'id'               => $r->id,
                'full_name'        => $r->full_name,
                'phone'            => $r->phone,
                'email'            => $r->email,
                'telegram_username'=> $r->telegram_username,
                'resident_type'    => $r->resident_type,
                'move_in_date'     => $r->move_in_date?->format('Y-m-d'),
                'is_active'        => $r->is_active,
                'apartment_id'     => $r->apartment_id,
                'pm_building_id'      => $r->apartment?->pm_building_id,
                'pm_project_id'       => $r->apartment?->building?->pm_project_id,
                'apartment'        => $r->apartment?->number,
                'building'         => $r->apartment?->building?->name,
                'project'          => $r->apartment?->building?->project?->name,
            ]);

        $projects = Project::with(['buildings' => function($q) {
            $q->orderBy('name');
        }])->orderBy('name')->get()->map(fn($p) => [
            'id'        => $p->id,
            'name'      => $p->name,
            'buildings' => $p->buildings->map(fn($b) => [
                'id'   => $b->id,
                'name' => $b->name,
            ]),
        ]);

        $apartments = Apartment::orderBy('number')->get()->map(fn($a) => [
            'id'          => $a->id,
            'number'      => $a->number,
            'pm_building_id' => $a->pm_building_id,
            'floor'       => $a->floor,
        ]);

        return Inertia::render('PM/Residents/Index', compact('residents', 'projects', 'apartments'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'apartment_id'     => ['required', 'exists:pm_apartments,id'],
            'full_name'        => ['required', 'string', 'max:255'],
            'phone'            => ['nullable', 'string', 'max:30'],
            'email'            => ['nullable', 'email'],
            'telegram_username'=> ['nullable', 'string', 'max:100'],
            'resident_type'    => ['required', 'in:owner,tenant,family'],
            'move_in_date'     => ['nullable', 'date'],
        ]);

        $data['company_id'] = auth()->user()->company_id;
        $data['is_active']  = true;

        Resident::create($data);

        return back()->with('success', 'Yashovchi qo\'shildi.');
    }

    public function update(Request $request, Resident $resident): RedirectResponse
    {
        $data = $request->validate([
            'apartment_id'     => ['required', 'exists:pm_apartments,id'],
            'full_name'        => ['required', 'string', 'max:255'],
            'phone'            => ['nullable', 'string', 'max:30'],
            'email'            => ['nullable', 'email'],
            'telegram_username'=> ['nullable', 'string', 'max:100'],
            'resident_type'    => ['required', 'in:owner,tenant,family'],
            'move_in_date'     => ['nullable', 'date'],
            'is_active'        => ['required', 'boolean'],
        ]);

        $resident->update($data);

        return back()->with('success', 'Yashovchi yangilandi.');
    }

    public function destroy(Resident $resident): RedirectResponse
    {
        $resident->update(['is_active' => false]);
        return back()->with('success', 'Yashovchi arxivlandi.');
    }
}


