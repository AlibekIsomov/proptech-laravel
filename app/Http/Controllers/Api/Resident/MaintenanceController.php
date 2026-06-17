<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRequest;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $resident = $request->attributes->get('resident');

        $requests = MaintenanceRequest::withoutGlobalScopes()
            ->where('resident_id', $resident->id)
            ->with('assignedVendor')
            ->latest()
            ->get()
            ->map(fn($r) => $this->requestData($r));

        return response()->json(['data' => $requests]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $resident = $request->attributes->get('resident');

        $req = MaintenanceRequest::withoutGlobalScopes()
            ->where('id', $id)
            ->where('resident_id', $resident->id)
            ->with('assignedVendor')
            ->firstOrFail();

        return response()->json(['data' => $this->requestData($req)]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $request->attributes->get('resident');

        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'category'    => ['required', 'string'],
            'priority'    => ['required', 'in:low,medium,high,critical'],
        ]);

        $req = MaintenanceRequest::create([
            ...$data,
            'resident_id'  => $resident->id,
            'apartment_id' => $resident->apartment_id,
            'building_id'  => $resident->apartment?->building_id,
            'company_id'   => $resident->company_id,
            'status'       => 'open',
        ]);

        return response()->json(['data' => $this->requestData($req)], 201);
    }

    public function rate(Request $request, string $id): JsonResponse
    {
        $resident = $request->attributes->get('resident');

        $req = MaintenanceRequest::withoutGlobalScopes()
            ->where('id', $id)
            ->where('resident_id', $resident->id)
            ->where('status', 'completed')
            ->firstOrFail();

        $data = $request->validate([
            'rating'   => ['required', 'integer', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string'],
        ]);

        $req->update([
            'resident_rating'   => $data['rating'],
            'resident_feedback' => $data['feedback'] ?? null,
        ]);

        return response()->json(['message' => 'Baholash qabul qilindi']);
    }

    private function requestData(MaintenanceRequest $r): array
    {
        return [
            'id'                   => $r->id,
            'title'                => $r->title,
            'description'          => $r->description,
            'category'             => $r->category,
            'priority'             => $r->priority,
            'status'               => $r->status,
            'assigned_vendor'      => $r->assignedVendor ? ['name' => $r->assignedVendor->name] : null,
            'resolution_notes'     => $r->resolution_notes,
            'resident_rating'      => $r->resident_rating,
            'created_at'           => $r->created_at?->toISOString(),
            'completed_at'         => $r->completed_at?->toISOString(),
        ];
    }
}
