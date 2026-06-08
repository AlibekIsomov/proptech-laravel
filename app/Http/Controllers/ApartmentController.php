<?php

namespace App\Http\Controllers;

use App\Models\Apartment;
use App\Models\Building;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ApartmentController extends Controller
{
    public function index(Request $request): Response
    {
        $user  = auth()->user();
        $query = Apartment::with(['building.project'])
            ->when($request->project_id, fn ($q, $id) =>
                $q->whereHas('building', fn ($b) => $b->where('project_id', $id))
            )
            ->when($request->building_id, fn ($q, $id) =>
                $q->where('building_id', $id)
            )
            ->when($request->status, fn ($q, $s) =>
                $q->where('status', $s)
            )
            ->when($request->search, fn ($q, $s) =>
                $q->where('number', 'like', "%{$s}%")
            );

        // Company filtering: non-super_admin faqat o'z kompaniyasining kvartiralarini ko'radi
        if (!$user->hasRole('super_admin')) {
            $query->whereHas('building.project', fn ($q) =>
                $q->where('company_id', $user->company_id)
            );
        }

        $apartments = $query->orderBy('floor')->orderBy('number')->get()
            ->map(fn ($a) => [
                'id'          => $a->id,
                'number'      => $a->number,
                'floor'       => $a->floor,
                'rooms'       => $a->rooms,
                'area'        => $a->area,
                'price'       => $a->price,
                'status'      => $a->status,
                'type'        => $a->type,
                'building_id' => $a->building_id,
                'building'    => $a->building?->name,
                'project'     => $a->building?->project?->name,
                'monthly_fee_per_sqm' => $a->building?->monthly_fee_per_sqm ?? 0,
            ]);

        // Project va building ham company bo'yicha filter qilinadi (Project CompanyScope orqali)
        $projects  = Project::select('id', 'name')->get();
        $buildings = Building::select('id', 'name', 'project_id')
            ->whereHas('project', function ($q) use ($user) {
                if (!$user->hasRole('super_admin')) {
                    $q->where('company_id', $user->company_id);
                }
            })->get();

        return Inertia::render('Apartments/Index', compact('apartments', 'projects', 'buildings'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'building_id' => ['required', 'exists:buildings,id'],
            'floor'       => ['required', 'integer', 'min:1'],
            'number'      => ['required', 'string', 'max:20'],
            'rooms'       => ['required', 'integer', 'min:0'],
            'area'        => ['nullable', 'numeric', 'min:0'],
            'price'       => ['nullable', 'numeric', 'min:0'],
            'status'      => ['required', 'in:available,reserved,sold'],
            'type'        => ['nullable', 'string'],
            'notes'       => ['nullable', 'string'],
        ]);

        Apartment::create($data);

        return back()->with('success', 'Kvartira yaratildi.');
    }

    public function update(Request $request, Apartment $apartment): RedirectResponse
    {
        $data = $request->validate([
            'floor'   => ['required', 'integer', 'min:1'],
            'number'  => ['required', 'string', 'max:20'],
            'rooms'   => ['required', 'integer', 'min:0'],
            'area'    => ['nullable', 'numeric', 'min:0'],
            'price'   => ['nullable', 'numeric', 'min:0'],
            'status'  => ['required', 'in:available,reserved,sold'],
            'type'    => ['nullable', 'string'],
            'notes'   => ['nullable', 'string'],
        ]);

        $apartment->update($data);

        return back()->with('success', 'Kvartira yangilandi.');
    }

    public function destroy(Apartment $apartment): RedirectResponse
    {
        $apartment->delete();
        return back()->with('success', 'Kvartira o\'chirildi.');
    }

    /**
     * Ommaviy kvartiralar yaratish — har xona turi uchun alohida sozlash
     *
     * apartment_types[] massiv qabul qiladi:
     *   { rooms: int, count_per_floor: int, area: float, price: float }
     */
    public function bulkGenerate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'building_id'                    => ['required', 'exists:buildings,id'],
            'floors'                         => ['required', 'integer', 'min:1', 'max:100'],
            'start_floor'                    => ['nullable', 'integer', 'min:1'],
            'apartment_types'                => ['required', 'array', 'min:1'],
            'apartment_types.*.rooms'        => ['required', 'integer', 'min:1', 'max:10'],
            'apartment_types.*.count_per_floor' => ['required', 'integer', 'min:1', 'max:20'],
            'apartment_types.*.area'         => ['required', 'numeric', 'min:1'],
            'apartment_types.*.price'        => ['nullable', 'numeric', 'min:0'],
        ]);

        $building   = Building::findOrFail($data['building_id']);
        $floors     = (int) $data['floors'];
        $startFloor = (int) ($data['start_floor'] ?? 1);
        $types      = $data['apartment_types'];

        $apartments = [];
        for ($floor = $startFloor; $floor < $startFloor + $floors; $floor++) {
            // Har etajda xona turlari ketma-ket raqamlanadi: 101, 102, 103 ...
            $aptSeq = 1;
            foreach ($types as $type) {
                $rooms        = (int)   $type['rooms'];
                $countPerFloor = (int)  $type['count_per_floor'];
                $area         = (float) $type['area'];
                $price        = isset($type['price']) && $type['price'] > 0
                                ? (float) $type['price']
                                : null;

                for ($i = 0; $i < $countPerFloor; $i++) {
                    $number = sprintf('%d%02d', $floor, $aptSeq);
                    $apartments[] = [
                        'building_id' => $building->id,
                        'floor'       => $floor,
                        'number'      => $number,
                        'rooms'       => $rooms,
                        'area'        => $area,
                        'price'       => $price,
                        'status'      => 'available',
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ];
                    $aptSeq++;
                }
            }
        }

        // Chunks bilan insert (performance)
        foreach (array_chunk($apartments, 100) as $chunk) {
            Apartment::insert($chunk);
        }

        $count = count($apartments);
        return back()->with('success', "{$count} ta kvartira ({$floors} qavat) muvaffaqiyatli yaratildi.");
    }

    /**
     * Kvartira haqida batafsil ma'lumot (PM Drawer uchun)
     */
    public function detail(Apartment $apartment): \Illuminate\Http\JsonResponse
    {
        $apartment->load(['building']);

        $resident = $apartment->residents()
            ->where('is_active', true)
            ->latest()
            ->first();

        $requests = $apartment->maintenanceRequests()
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'id'          => $r->id,
                'title'       => $r->title,
                'description' => $r->description,
                'priority'    => $r->priority,
                'status'      => $r->status,
                'created_at'  => $r->created_at->format('Y-m-d H:i:s'),
            ]);

        $meters = $apartment->utilityMeters()
            ->where('is_active', true)
            ->with(['readings' => fn ($q) => $q->latest()->limit(1)])
            ->get()
            ->map(fn ($m) => [
                'id'             => $m->id,
                'meter_type'     => $m->meter_type,
                'serial_number'  => $m->serial_number,
                'unit'           => $m->unit,
                'initial_reading'=> $m->initial_reading,
                'latest_reading' => $m->readings->first() ? [
                    'reading_value' => $m->readings->first()->reading_value,
                    'reading_date'  => $m->readings->first()->reading_date->format('Y-m-d'),
                ] : null,
            ]);

        $invoices = $apartment->pmInvoices()
            ->latest()
            ->limit(12)
            ->get()
            ->map(fn ($i) => [
                'id'                   => $i->id,
                'invoice_number'       => $i->invoice_number,
                'billing_period_start' => $i->billing_period_start->format('Y-m-d'),
                'billing_period_end'   => $i->billing_period_end->format('Y-m-d'),
                'total_amount'         => (float) $i->total_amount,
                'currency'             => $i->currency,
                'status'               => $i->status,
            ]);

        return response()->json([
            'apartment' => [
                'id'          => $apartment->id,
                'number'      => $apartment->number,
                'floor'       => $apartment->floor,
                'size_m2'     => $apartment->area,
                'rooms_count' => $apartment->rooms,
                'building'    => $apartment->building?->name,
            ],
            'resident'  => $resident ? [
                'full_name'         => $resident->full_name,
                'resident_type'     => $resident->resident_type,
                'phone'             => $resident->phone,
                'email'             => $resident->email,
                'telegram_username' => $resident->telegram_username,
                'move_in_date'      => $resident->move_in_date ? $resident->move_in_date->format('Y-m-d') : null,
            ] : null,
            'requests'  => $requests,
            'meters'    => $meters,
            'invoices'  => $invoices,
        ]);
    }

    /**
     * Get floors, apartments, and managers for a building floor plan
     */
    public function floorPlan(string $buildingId): \Illuminate\Http\JsonResponse
    {
        $building = Building::findOrFail($buildingId);
        
        // Get all apartments in this building
        $apartments = Apartment::where('building_id', $buildingId)->get()->map(function($a) use ($building) {
            $client = $a->clients()->first();
            return [
                'id' => $a->id,
                'floor_id' => $a->floor, // map floor number as floor_id for compatibility
                'number' => $a->number,
                'rooms_count' => $a->rooms,
                'size_m2' => (float)$a->area,
                'price' => (float)$a->price,
                'status' => $a->status,
                'client_id' => $client?->id ?? null,
                'assigned_manager_id' => $client?->assigned_to ?? null,
                'client' => $client ? [
                    'id' => $client->id,
                    'full_name' => $client->full_name,
                    'phone' => $client->phone,
                    'assigned_to' => $client->assigned_to,
                ] : null,
                'monthly_fee_per_sqm' => (float)$building->monthly_fee_per_sqm,
            ];
        });

        // Get unique floor numbers from apartments and format as floors
        $floors = $apartments->pluck('floor_id')->unique()->sort()->values()->map(fn($f) => [
            'id' => (string)$f,
            'floor_number' => (int)$f,
        ]);

        // Get all users in the same company
        $managers = \App\Models\User::where('company_id', auth()->user()->company_id)->get()->map(fn($u) => [
            'id' => $u->id,
            'full_name' => $u->full_name ?? $u->email,
            'email' => $u->email,
        ]);

        return response()->json([
            'floors' => $floors,
            'apartments' => $apartments,
            'managers' => $managers,
        ]);
    }

    /**
     * Update apartment status
     */
    public function updateStatus(Request $request, Apartment $apartment): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:available,reserved,sold',
        ]);

        $apartment->update($data);

        return response()->json(['success' => true]);
    }

    /**
     * Assign manager to apartment
     */
    public function assignManager(Request $request, Apartment $apartment): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'assigned_manager_id' => 'required|exists:users,id',
        ]);

        $client = $apartment->clients()->first();
        if ($client) {
            $client->update(['assigned_to' => $data['assigned_manager_id']]);
        }

        return response()->json(['success' => true]);
    }
}

