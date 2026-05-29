<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\PMAsset;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller
{
    /**
     * Display a listing of the resource or fetch JSON list.
     */
    public function index(Request $request)
    {
        if (($request->wantsJson() || $request->ajax()) && !$request->header('X-Inertia')) {
            $buildingId = $request->query('building_id');
            if (!$buildingId) {
                return response()->json(['assets' => [], 'items' => []]);
            }

            if ($request->query('type') === 'supply') {
                $items = \App\Models\InventoryItem::where('building_id', $buildingId)
                    ->orderBy('name')
                    ->get()
                    ->map(fn($i) => [
                        'id'            => $i->id,
                        'building_id'   => $i->building_id,
                        'name'          => $i->name,
                        'category'      => $i->category,
                        'quantity'      => $i->quantity,
                        'unit'          => $i->unit,
                        'min_threshold' => $i->min_threshold,
                        'unit_cost'     => (float) $i->unit_cost,
                        'supplier'      => $i->supplier,
                        'notes'         => $i->notes,
                        'is_low_stock'  => $i->isLowStock(),
                    ]);

                return response()->json(['items' => $items]);
            }

            $assets = PMAsset::where('building_id', $buildingId)
                ->orderBy('status')
                ->orderBy('name')
                ->get()
                ->map(fn($a) => [
                    'id'                    => $a->id,
                    'building_id'           => $a->building_id,
                    'name'                  => $a->name,
                    'category'              => $a->category,
                    'serial_number'         => $a->serial_number,
                    'manufacturer'          => $a->manufacturer,
                    'installed_at'          => $a->installed_at ? $a->installed_at->format('Y-m-d') : null,
                    'warranty_until'        => $a->warranty_until ? $a->warranty_until->format('Y-m-d') : null,
                    'next_service_at'       => $a->next_service_at ? $a->next_service_at->format('Y-m-d') : null,
                    'service_interval_days' => $a->service_interval_days,
                    'location'              => $a->location,
                    'notes'                 => $a->notes,
                    'status'                => $a->status,
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

        return Inertia::render('PM/Inventory/Index', [
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if ($request->input('type') === 'supply') {
            $data = $request->validate([
                'building_id'   => 'required|exists:buildings,id',
                'name'          => 'required|string|max:255',
                'category'      => 'nullable|string|max:255',
                'quantity'      => 'required|integer|min:0',
                'unit'          => 'nullable|string|max:50',
                'min_threshold' => 'nullable|integer|min:0',
                'unit_cost'     => 'nullable|numeric|min:0',
                'supplier'      => 'nullable|string|max:255',
                'notes'         => 'nullable|string',
            ]);

            $data['company_id'] = auth()->user()->company_id;

            $item = \App\Models\InventoryItem::create($data);

            return response()->json(['success' => true, 'item' => $item]);
        }

        $data = $request->validate([
            'building_id'           => 'required|exists:buildings,id',
            'name'                  => 'required|string|max:255',
            'category'              => 'required|in:elevator,pump,boiler,hvac,electrical,plumbing,security,other',
            'serial_number'         => 'nullable|string|max:255',
            'manufacturer'          => 'nullable|string|max:255',
            'location'              => 'nullable|string|max:255',
            'installed_at'          => 'nullable|date',
            'warranty_until'        => 'nullable|date',
            'next_service_at'       => 'nullable|date',
            'service_interval_days' => 'nullable|integer|min:0',
            'notes'                 => 'nullable|string',
            'status'                => 'required|in:operational,needs_service,broken,retired',
        ]);

        $asset = PMAsset::create($data);

        return response()->json(['success' => true, 'asset' => $asset]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $item = \App\Models\InventoryItem::find($id);
        if ($item) {
            $data = $request->validate([
                'name'          => 'required|string|max:255',
                'category'      => 'nullable|string|max:255',
                'quantity'      => 'required|integer|min:0',
                'unit'          => 'nullable|string|max:50',
                'min_threshold' => 'nullable|integer|min:0',
                'unit_cost'     => 'nullable|numeric|min:0',
                'supplier'      => 'nullable|string|max:255',
                'notes'         => 'nullable|string',
            ]);

            $item->update($data);

            return response()->json(['success' => true]);
        }

        $asset = PMAsset::findOrFail($id);

        $data = $request->validate([
            'name'                  => 'required|string|max:255',
            'category'              => 'required|in:elevator,pump,boiler,hvac,electrical,plumbing,security,other',
            'serial_number'         => 'nullable|string|max:255',
            'manufacturer'          => 'nullable|string|max:255',
            'location'              => 'nullable|string|max:255',
            'installed_at'          => 'nullable|date',
            'warranty_until'        => 'nullable|date',
            'next_service_at'       => 'nullable|date',
            'service_interval_days' => 'nullable|integer|min:0',
            'notes'                 => 'nullable|string',
            'status'                => 'required|in:operational,needs_service,broken,retired',
        ]);

        $asset->update($data);

        return response()->json(['success' => true]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $item = \App\Models\InventoryItem::find($id);
        if ($item) {
            $item->delete();
            return response()->json(['success' => true]);
        }

        $asset = PMAsset::findOrFail($id);
        $asset->delete();

        return response()->json(['success' => true]);
    }
}
