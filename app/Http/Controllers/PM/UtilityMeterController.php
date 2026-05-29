<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\UtilityMeter;
use App\Models\MeterReading;
use App\Models\Apartment;
use App\Services\ClaudeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UtilityMeterController extends Controller
{
    public function index(): Response
    {
        $meters = UtilityMeter::with(['apartment.building', 'readings' => fn ($q) => $q->latest()->limit(1)])
            ->where('is_active', true)
            ->get()
            ->map(fn ($m) => [
                'id'              => $m->id,
                'apartment_id'    => $m->apartment_id,
                'apartment'       => $m->apartment?->number,
                'building'        => $m->apartment?->building?->name,
                'meter_type'      => $m->meter_type,
                'serial_number'   => $m->serial_number,
                'unit'            => $m->unit,
                'installed_date'  => $m->installed_date?->format('Y-m-d'),
                'initial_reading' => $m->initial_reading,
                'last_reading'    => $m->readings->first()?->reading_value,
                'last_date'       => $m->readings->first()?->reading_date?->format('Y-m-d'),
            ]);

        $apartments = Apartment::with('building')->get()->map(fn ($a) => [
            'id'    => $a->id,
            'label' => "№{$a->number} — {$a->building?->name}",
        ]);

        return Inertia::render('PM/Meters/Index', compact('meters', 'apartments'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'apartment_id'   => ['required', 'exists:apartments,id'],
            'meter_type'     => ['required', 'in:electricity,gas,water_cold,water_hot,heating'],
            'serial_number'  => ['nullable', 'string', 'max:100'],
            'unit'           => ['required', 'string', 'max:20'],
            'installed_date' => ['nullable', 'date'],
            'initial_reading'=> ['required', 'numeric', 'min:0'],
        ]);

        $data['company_id'] = auth()->user()->company_id;
        $data['is_active']  = true;

        UtilityMeter::create($data);

        return back()->with('success', 'Hisoblagich qo\'shildi.');
    }

    /**
     * Ko'rsatkich kiritish
     */
    public function addReading(Request $request, UtilityMeter $meter): RedirectResponse
    {
        $data = $request->validate([
            'reading_value' => ['required', 'numeric', 'min:0'],
            'reading_date'  => ['required', 'date'],
            'source'        => ['required', 'in:manual,photo_ai,smart_meter'],
            'photo_url'     => ['nullable', 'string'],
        ]);

        $lastReading = $meter->readings()->latest('reading_date')->value('reading_value')
            ?? $meter->initial_reading;

        $diff = $data['reading_value'] - $lastReading;

        MeterReading::create([
            'meter_id'        => $meter->id,
            'apartment_id'    => $meter->apartment_id,
            'reading_value'   => $data['reading_value'],
            'reading_date'    => $data['reading_date'],
            'consumption_diff'=> $diff >= 0 ? $diff : 0,
            'source'          => $data['source'],
            'photo_url'       => $data['photo_url'] ?? null,
            'recorded_by'     => auth()->id(),
        ]);

        return back()->with('success', 'Ko\'rsatkich kiritildi.');
    }

    /**
     * POST /pm/meters/readings/photo — AI OCR foto orqali ko'rsatkich
     */
    public function photoReading(Request $request, ClaudeService $claude): JsonResponse
    {
        $request->validate(['photo_url' => ['required', 'string']]);

        $prompt = "Bu suratda kommunal hisoblagich ko'rsatkichi ko'rinadi. Faqat raqamni o'qib qaytaring (masalan: 12345.67). Agar o'qiy olmasangiz null deb yozing.";
        $result = $claude->complete($prompt . "\n\nFoto URL: " . $request->photo_url, 64);

        $value = is_numeric(trim($result)) ? (float) trim($result) : null;

        return response()->json(['value' => $value, 'raw' => $result]);
    }

    public function destroy(UtilityMeter $meter): RedirectResponse
    {
        $meter->update(['is_active' => false]);
        return back()->with('success', 'Hisoblagich arxivlandi.');
    }
}
