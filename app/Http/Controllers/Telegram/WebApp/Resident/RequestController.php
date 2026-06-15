<?php

namespace App\Http\Controllers\Telegram\WebApp\Resident;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Telegram\WebApp\ResolvesTelegramSession;
use App\Models\MaintenancePhoto;
use App\Models\MaintenanceRequest;
use App\Services\Telegram\Keyboards;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class RequestController extends Controller
{
    use ResolvesTelegramSession;

    public function index(Request $request): JsonResponse
    {
        $session = $this->session($request);

        abort_unless($session->active_resident_id !== null, 403);

        $requests = MaintenanceRequest::where('resident_id', $session->active_resident_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (MaintenanceRequest $r) => $this->transform($r));

        return response()->json(['data' => $requests]);
    }

    public function store(Request $request): JsonResponse
    {
        $session = $this->session($request);

        abort_unless($session->active_resident_id !== null, 403);

        $data = $request->validate([
            'category' => ['required', Rule::in(array_keys(Keyboards::CATEGORY_LABELS))],
            'priority' => ['required', Rule::in(array_keys(Keyboards::PRIORITY_LABELS))],
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ]);

        $resident = $session->activeResident()->with('apartment')->first();

        abort_unless($resident && $resident->apartment, 422, "Kvartira ma'lumotlari topilmadi.");

        $requestModel = MaintenanceRequest::create([
            'apartment_id' => $resident->apartment_id,
            'building_id' => $resident->apartment->pm_building_id,
            'company_id' => $resident->company_id,
            'resident_id' => $resident->id,
            'category' => $data['category'],
            'priority' => $data['priority'],
            'status' => 'open',
            'title' => $data['title'],
            'description' => $data['description'] ?? '',
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('maintenance', 'public');

            MaintenancePhoto::create([
                'request_id' => $requestModel->id,
                'photo_url' => Storage::url($path),
                'photo_type' => 'before',
            ]);
        }

        return response()->json(['data' => $this->transform($requestModel->fresh(), true)], 201);
    }

    public function show(Request $request, MaintenanceRequest $requestModel): JsonResponse
    {
        $session = $this->session($request);

        abort_unless($session->active_resident_id !== null, 403);
        abort_unless($requestModel->resident_id === $session->active_resident_id, 404);

        return response()->json(['data' => $this->transform($requestModel, true)]);
    }

    public function rate(Request $request, MaintenanceRequest $requestModel): JsonResponse
    {
        $session = $this->session($request);

        abort_unless($session->active_resident_id !== null, 403);
        abort_unless($requestModel->resident_id === $session->active_resident_id, 404);

        if ($requestModel->status !== 'completed') {
            return response()->json(['message' => "Faqat bajarilgan murojaatlarni baholash mumkin."], 422);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        $requestModel->update([
            'resident_rating' => $data['rating'],
            'resident_feedback' => $data['feedback'] ?? null,
        ]);

        return response()->json(['data' => $this->transform($requestModel->fresh(), true)]);
    }

    protected function transform(MaintenanceRequest $r, bool $detailed = false): array
    {
        $data = [
            'id' => $r->id,
            'title' => $r->title,
            'description' => $r->description,
            'category' => $r->category,
            'category_label' => Keyboards::categoryLabel($r->category),
            'priority' => $r->priority,
            'priority_label' => Keyboards::priorityLabel($r->priority),
            'status' => $r->status,
            'status_label' => Keyboards::statusLabel($r->status),
            'resident_rating' => $r->resident_rating,
            'created_at' => $r->created_at->toISOString(),
        ];

        if ($detailed) {
            $data['resolution_notes'] = $r->resolution_notes;
            $data['resident_feedback'] = $r->resident_feedback;
            $data['completed_at'] = $r->completed_at?->toISOString();
            $data['photos'] = $r->photos->map(fn ($p) => [
                'id' => $p->id,
                'url' => $p->photo_url,
                'type' => $p->photo_type,
            ])->values();
        }

        return $data;
    }
}
