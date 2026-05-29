<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\CommunalAsset;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CommunalController extends Controller
{
    /**
     * Display a listing of the resource or fetch JSON list.
     */
    public function index(Request $request)
    {
        if (($request->wantsJson() || $request->ajax()) && !$request->header('X-Inertia')) {
            $buildingId = $request->query('building_id');
            if (!$buildingId) {
                return response()->json(['assets' => []]);
            }

            $assets = CommunalAsset::where('building_id', $buildingId)
                ->orderBy('status')
                ->orderBy('name')
                ->get()
                ->map(fn($a) => [
                    'id'                   => $a->id,
                    'building_id'          => $a->building_id,
                    'asset_type'           => $a->asset_type,
                    'name'                 => $a->name,
                    'description'          => $a->description,
                    'status'               => $a->status,
                    'last_inspection_date' => $a->last_inspection_date ? $a->last_inspection_date->format('Y-m-d') : null,
                    'next_inspection_date' => $a->next_inspection_date ? $a->next_inspection_date->format('Y-m-d') : null,
                ]);

            return response()->json(['assets' => $assets]);
        }

        $projects = Project::with(['buildings' => function($q) {
            $q->orderBy('name');
        }])->orderBy('name')->get()->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'buildings' => $p->buildings->map(fn($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'project_id' => $b->project_id,
            ]),
        ]);

        return Inertia::render('PM/Communal/Index', [
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'building_id'          => 'required|exists:buildings,id',
            'name'                 => 'required|string|max:255',
            'asset_type'           => 'required|in:elevator,entrance,parking,playground,common_area,roof,facade,other',
            'description'          => 'nullable|string',
            'status'               => 'required|in:operational,maintenance,broken,retired',
            'last_inspection_date' => 'nullable|date',
            'next_inspection_date' => 'nullable|date',
        ]);

        $data['company_id'] = auth()->user()->company_id;

        $asset = CommunalAsset::create($data);

        return response()->json(['success' => true, 'asset' => $asset]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $asset = CommunalAsset::findOrFail($id);

        $data = $request->validate([
            'name'                 => 'sometimes|required|string|max:255',
            'asset_type'           => 'sometimes|required|in:elevator,entrance,parking,playground,common_area,roof,facade,other',
            'description'          => 'nullable|string',
            'status'               => 'sometimes|required|in:operational,maintenance,broken,retired',
            'last_inspection_date' => 'nullable|date',
            'next_inspection_date' => 'nullable|date',
        ]);

        $asset->update($data);

        return response()->json(['success' => true]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $asset = CommunalAsset::findOrFail($id);
        $asset->delete();

        return response()->json(['success' => true]);
    }
}
