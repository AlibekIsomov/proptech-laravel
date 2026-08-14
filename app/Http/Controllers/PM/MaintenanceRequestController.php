<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzeMaintenanceRequest;
use App\Models\MaintenanceRequest;
use App\Models\PM\Apartment;
use App\Models\PM\Project;
use App\Models\Resident;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $query = MaintenanceRequest::with(['apartment.building', 'resident', 'assignedVendor', 'dispatcher'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->priority, fn ($q, $p) => $q->where('priority', $p))
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q2) => $q2->where('title', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")
            )
            );

        $requests = $query
            ->orderByRaw("CASE priority WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'title' => $r->title,
                'description' => $r->description,
                'category' => $r->category,
                'priority' => $r->priority,
                'status' => $r->status,
                'ai_category_suggested' => $r->ai_category_suggested,
                'ai_priority_suggested' => $r->ai_priority_suggested,
                'ai_summary' => $r->ai_summary,
                'apartment' => $r->apartment?->number,
                'building' => $r->apartment?->building?->name,
                'resident' => $r->resident?->full_name,
                'is_repeat' => $r->repeat_of_id !== null,
                'assigned_vendor_id' => $r->assigned_vendor_id,
                'vendor' => $r->assignedVendor?->name,
                'dispatcher' => $r->dispatcher?->full_name,
                'cost_amount' => $r->cost_amount,
                'resident_rating' => $r->resident_rating,
                'sla_deadline' => $r->sla_deadline?->toISOString(),
                'created_at' => $r->created_at->toISOString(),
                'assigned_at' => $r->assigned_at?->toISOString(),
                'completed_at' => $r->completed_at?->toISOString(),
            ]);

        // Eng ishonchli usta birinchi — reyting takror-nosozlik jarimasini o'z ichiga oladi
        $vendors = Vendor::where('is_active', true)
            ->orderByDesc('rating')
            ->get(['id', 'name', 'specializations', 'rating', 'completed_jobs']);

        $projects = Project::with(['buildings' => function ($q) {
            $q->orderBy('name');
        }])->orderBy('name')->get()->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'buildings' => $p->buildings->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
            ]),
        ]);

        $apartments = Apartment::orderBy('floor')->orderBy('number')
            ->get()
            ->unique(fn ($a) => $a->pm_building_id.'-'.$a->number)
            ->map(fn ($a) => [
                'id' => $a->id,
                'number' => $a->number,
                'pm_building_id' => $a->pm_building_id,
                'floor' => $a->floor,
            ])
            ->values();

        $residents = Resident::where('is_active', true)->get(['id', 'full_name', 'apartment_id']);

        return Inertia::render('PM/Requests/Index', compact('requests', 'vendors', 'projects', 'apartments', 'residents'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'apartment_id' => ['required', 'exists:pm_apartments,id'],
            'resident_id' => ['nullable', 'exists:residents,id'],
            'assigned_vendor_id' => ['nullable', 'exists:vendors,id'],
            'category' => ['nullable', 'string'],
            'priority' => ['required', 'in:low,medium,high,emergency'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
        ]);

        $apt = Apartment::find($data['apartment_id']);
        $data['building_id'] = $apt?->pm_building_id;
        $data['company_id'] = auth()->user()->company_id;

        if (! empty($data['assigned_vendor_id'])) {
            $data['status'] = 'assigned';
            $data['assigned_at'] = now();
        }

        MaintenanceRequest::create($data);

        return back()->with('success', 'Ariza yaratildi.');
    }

    public function update(Request $request, MaintenanceRequest $requestModel): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:open,assigned,in_progress,completed,cancelled'],
            'assigned_vendor_id' => ['nullable', 'exists:vendors,id'],
            'category' => ['nullable', 'string'],
            'priority' => ['required', 'in:low,medium,high,emergency'],
            'resolution_notes' => ['nullable', 'string'],
            'cost_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Timestamps
        if ($data['status'] === 'assigned' && ! $requestModel->assigned_at) {
            $data['assigned_at'] = now();
        }
        if ($data['status'] === 'in_progress' && ! $requestModel->started_at) {
            $data['started_at'] = now();
        }
        if ($data['status'] === 'completed' && ! $requestModel->completed_at) {
            $data['completed_at'] = now();
        }

        $requestModel->update($data);

        return back()->with('success', 'Ariza yangilandi.');
    }

    public function destroy(MaintenanceRequest $requestModel): RedirectResponse
    {
        $requestModel->delete();

        return back()->with('success', 'Ariza o\'chirildi.');
    }

    /**
     * POST /pm/requests/{request}/ai-categorize
     * AI tahlilini qo'lda qayta ishga tushirish. Ariza yaratilganda bu avtomatik
     * bajariladi — bu yo'l AI javob bermay qolgan arizalar uchun. Foto bo'lsa
     * o'sha job Vision orqali work order yozadi, shuning uchun mantiq takrorlanmaydi.
     */
    public function aiCategorize(MaintenanceRequest $requestModel): JsonResponse
    {
        dispatch_sync(new AnalyzeMaintenanceRequest($requestModel->id, force: true));

        $requestModel->refresh();

        return response()->json([
            'category' => $requestModel->ai_category_suggested,
            'priority' => $requestModel->ai_priority_suggested,
            'summary' => $requestModel->ai_summary,
        ]);
    }
}
