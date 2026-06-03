<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRequest;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VendorController extends Controller
{
    public function index(): Response
    {
        $vendors = Vendor::latest()->get()->map(fn ($v) => [
            'id'             => $v->id,
            'name'           => $v->name,
            'phone'          => $v->phone,
            'email'          => $v->email,
            'telegram_username' => $v->telegram_username,
            'specializations'   => $v->specializations ?? [],
            'rating'            => $v->rating,
            'total_jobs'        => $v->total_jobs,
            'completed_jobs'    => $v->completed_jobs,
            'is_active'         => $v->is_active,
            'notes'             => $v->notes,
        ]);

        return Inertia::render('PM/Vendors/Index', compact('vendors'));
    }

    public function show(Vendor $vendor): JsonResponse
    {
        $requests = MaintenanceRequest::where('assigned_vendor_id', $vendor->id)
            ->with(['apartment.building'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => [
                'id'              => $r->id,
                'title'           => $r->title,
                'category'        => $r->category,
                'priority'        => $r->priority,
                'status'          => $r->status,
                'apartment'       => $r->apartment?->number,
                'building'        => $r->apartment?->building?->name,
                'cost_amount'     => $r->cost_amount,
                'resident_rating' => $r->resident_rating,
                'created_at'      => $r->created_at->format('Y-m-d'),
                'completed_at'    => $r->completed_at?->format('Y-m-d'),
            ]);

        $completed   = $requests->where('status', 'completed')->count();
        $inProgress  = $requests->whereIn('status', ['assigned', 'in_progress'])->count();
        $totalEarned = $requests->sum(fn($r) => (float) ($r['cost_amount'] ?? 0));
        $avgRating   = $requests->where('resident_rating', '>', 0)->avg('resident_rating');

        return response()->json([
            'vendor'   => [
                'id'                => $vendor->id,
                'name'              => $vendor->name,
                'phone'             => $vendor->phone,
                'email'             => $vendor->email,
                'telegram_username' => $vendor->telegram_username,
                'specializations'   => $vendor->specializations ?? [],
                'rating'            => (float) $vendor->rating,
                'total_jobs'        => $vendor->total_jobs,
                'completed_jobs'    => $vendor->completed_jobs,
                'is_active'         => $vendor->is_active,
                'notes'             => $vendor->notes,
            ],
            'requests' => $requests->values(),
            'stats'    => [
                'total'       => $requests->count(),
                'completed'   => $completed,
                'in_progress' => $inProgress,
                'open'        => $requests->where('status', 'open')->count(),
                'total_earned'=> round($totalEarned, 2),
                'avg_rating'  => $avgRating ? round($avgRating, 1) : null,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'phone'            => ['required', 'string', 'max:30'],
            'email'            => ['nullable', 'email'],
            'telegram_username'=> ['nullable', 'string', 'max:100'],
            'specializations'  => ['nullable', 'array'],
            'specializations.*'=> ['string'],
            'notes'            => ['nullable', 'string'],
        ]);

        $data['company_id']     = auth()->user()->company_id;
        $data['specializations']= $data['specializations'] ?? [];

        Vendor::create($data);

        return back()->with('success', 'Vendor qo\'shildi.');
    }

    public function update(Request $request, Vendor $vendor): RedirectResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'phone'            => ['required', 'string', 'max:30'],
            'email'            => ['nullable', 'email'],
            'telegram_username'=> ['nullable', 'string', 'max:100'],
            'specializations'  => ['nullable', 'array'],
            'is_active'        => ['required', 'boolean'],
            'notes'            => ['nullable', 'string'],
        ]);

        $vendor->update($data);

        return back()->with('success', 'Vendor yangilandi.');
    }

    public function destroy(Vendor $vendor): RedirectResponse
    {
        $vendor->delete();
        return back()->with('success', 'Vendor o\'chirildi.');
    }
}


