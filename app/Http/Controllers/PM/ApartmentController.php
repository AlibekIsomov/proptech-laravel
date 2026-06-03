<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PMInvoice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApartmentController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pm_building_id' => ['required', 'uuid', 'exists:pm_buildings,id'],
            'floor'          => ['required', 'integer', 'min:1'],
            'number'         => ['required', 'string', 'max:20'],
            'rooms'          => ['required', 'integer', 'min:0'],
            'area'           => ['nullable', 'numeric', 'min:0'],
        ]);

        Apartment::create($data);

        return back()->with('success', 'Kvartira yaratildi.');
    }

    public function update(Request $request, Apartment $apartment): RedirectResponse
    {
        $data = $request->validate([
            'floor'  => ['required', 'integer', 'min:1'],
            'number' => ['required', 'string', 'max:20'],
            'rooms'  => ['required', 'integer', 'min:0'],
            'area'   => ['nullable', 'numeric', 'min:0'],
        ]);

        $apartment->update($data);

        return back()->with('success', 'Kvartira yangilandi.');
    }

    public function destroy(Apartment $apartment): RedirectResponse
    {
        $apartment->delete();
        return back()->with('success', "Kvartira o'chirildi.");
    }

    public function bulkGenerate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pm_building_id'                    => ['required', 'uuid', 'exists:pm_buildings,id'],
            'floors'                            => ['required', 'integer', 'min:1', 'max:100'],
            'start_floor'                       => ['nullable', 'integer', 'min:1'],
            'apartment_types'                   => ['required', 'array', 'min:1'],
            'apartment_types.*.rooms'           => ['required', 'integer', 'min:1', 'max:10'],
            'apartment_types.*.count_per_floor' => ['required', 'integer', 'min:1', 'max:20'],
            'apartment_types.*.area'            => ['required', 'numeric', 'min:1'],
        ]);

        $floors     = (int) $data['floors'];
        $startFloor = (int) ($data['start_floor'] ?? 1);
        $types      = $data['apartment_types'];

        $apartments = [];
        for ($floor = $startFloor; $floor < $startFloor + $floors; $floor++) {
            $aptSeq = 1;
            foreach ($types as $type) {
                $rooms         = (int)   $type['rooms'];
                $countPerFloor = (int)   $type['count_per_floor'];
                $area          = (float) $type['area'];

                for ($i = 0; $i < $countPerFloor; $i++) {
                    $apartments[] = [
                        'id'             => (string) Str::uuid(),
                        'pm_building_id' => $data['pm_building_id'],
                        'floor'          => $floor,
                        'number'         => sprintf('%d%02d', $floor, $aptSeq),
                        'rooms'          => $rooms,
                        'area'           => $area,
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ];
                    $aptSeq++;
                }
            }
        }

        foreach (array_chunk($apartments, 100) as $chunk) {
            Apartment::insert($chunk);
        }

        return back()->with('success', count($apartments) . " ta kvartira ({$floors} qavat) muvaffaqiyatli yaratildi.");
    }

    public function updateStatus(Request $request, Apartment $apartment): \Illuminate\Http\JsonResponse
    {
        // PM apartments derive status from residents — no status column exists.
        return response()->json(['success' => true]);
    }

    public function assignManager(Request $request, Apartment $apartment): \Illuminate\Http\JsonResponse
    {
        // Manager assignment is not applicable in the PM portal.
        return response()->json(['success' => true]);
    }

    /**
     * Apartment detail for the PM drawer.
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

        $meters = $apartment->meters()
            ->where('is_active', true)
            ->with(['readings' => fn ($q) => $q->latest()->limit(1)])
            ->get()
            ->map(fn ($m) => [
                'id'              => $m->id,
                'meter_type'      => $m->meter_type,
                'serial_number'   => $m->serial_number,
                'unit'            => $m->unit,
                'initial_reading' => $m->initial_reading,
                'latest_reading'  => $m->readings->first() ? [
                    'reading_value' => $m->readings->first()->reading_value,
                    'reading_date'  => $m->readings->first()->reading_date->format('Y-m-d'),
                ] : null,
            ]);

        $invoices = $apartment->invoices()
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
     * Floor plan for a building — occupied vs vacant derived from residents.
     */
    public function floorPlan(string $buildingId): \Illuminate\Http\JsonResponse
    {
        $building = Building::findOrFail($buildingId);

        $apts = Apartment::with(['residents' => fn($q) => $q->where('is_active', true)])
            ->where('pm_building_id', $buildingId)
            ->get();

        // Fetch current month invoices for this building in one query
        $startOfMonth = now()->startOfMonth()->toDateString();
        $aptIds = $apts->pluck('id');
        $currentInvoices = PMInvoice::where('billing_period_start', $startOfMonth)
            ->whereIn('apartment_id', $aptIds)
            ->get()
            ->keyBy('apartment_id');

        $apartments = $apts->map(function ($a) use ($building, $currentInvoices) {
            $resident   = $a->residents->first();
            $feePerSqm  = (float) $building->monthly_fee_per_sqm;
            $area       = (float) $a->area;
            $monthlyFee = $feePerSqm > 0 && $area > 0 ? round($feePerSqm * $area, 2) : 0;

            $inv = $currentInvoices->get($a->id);

            return [
                'id'                  => $a->id,
                'floor_id'            => $a->floor,
                'number'              => $a->number,
                'rooms_count'         => $a->rooms,
                'size_m2'             => $area,
                'price'               => 0,
                'status'              => $resident ? 'sold' : 'available',
                'client_id'           => $resident?->id ?? null,
                'assigned_manager_id' => null,
                'client'              => $resident ? [
                    'id'         => $resident->id,
                    'full_name'  => $resident->full_name,
                    'phone'      => $resident->phone,
                    'assigned_to'=> null,
                ] : null,
                'monthly_fee_per_sqm' => $feePerSqm,
                'monthly_fee'         => $monthlyFee,
                'current_invoice'     => $inv ? [
                    'id'     => $inv->id,
                    'status' => $inv->status,
                    'amount' => (float) $inv->total_amount,
                    'period' => now()->format('Y-m'),
                ] : null,
            ];
        });

        $floors = $apartments->pluck('floor_id')->unique()->sort()->values()->map(fn ($f) => [
            'id'           => (string) $f,
            'floor_number' => (int) $f,
        ]);

        return response()->json([
            'floors'     => $floors,
            'apartments' => $apartments,
            'managers'   => [],
        ]);
    }
}
