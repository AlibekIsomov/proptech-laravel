<?php

namespace App\Http\Controllers\Telegram\WebApp\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Telegram\WebApp\ResolvesTelegramSession;
use App\Models\MaintenanceRequest;
use App\Services\Telegram\Keyboards;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RequestController extends Controller
{
    use ResolvesTelegramSession;

    public function index(Request $request): JsonResponse
    {
        $session = $this->session($request);

        abort_unless($session->vendor_id !== null, 403);

        $query = MaintenanceRequest::where('assigned_vendor_id', $session->vendor_id);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        } else {
            $query->whereIn('status', ['assigned', 'in_progress', 'completed']);
        }

        $requests = $query->with('apartment')
            ->orderByRaw("CASE priority WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->latest()
            ->get()
            ->map(fn (MaintenanceRequest $r) => $this->transform($r));

        return response()->json(['data' => $requests]);
    }

    public function show(Request $request, MaintenanceRequest $requestModel): JsonResponse
    {
        $session = $this->session($request);

        abort_unless($session->vendor_id !== null, 403);
        abort_unless($requestModel->assigned_vendor_id === $session->vendor_id, 404);

        $requestModel->load('apartment');

        return response()->json(['data' => $this->transform($requestModel, true)]);
    }

    public function updateStatus(Request $request, MaintenanceRequest $requestModel): JsonResponse
    {
        $session = $this->session($request);

        abort_unless($session->vendor_id !== null, 403);
        abort_unless($requestModel->assigned_vendor_id === $session->vendor_id, 404);

        $data = $request->validate([
            'status' => ['required', Rule::in(['in_progress', 'completed'])],
        ]);

        $allowedTransitions = ['assigned' => 'in_progress', 'in_progress' => 'completed'];

        if (($allowedTransitions[$requestModel->status] ?? null) !== $data['status']) {
            return response()->json([
                'message' => "Holatni '{$requestModel->status}' dan '{$data['status']}' ga o'zgartirib bo'lmaydi.",
            ], 422);
        }

        $update = ['status' => $data['status']];

        if ($data['status'] === 'in_progress') {
            $update['started_at'] = now();
        } elseif ($data['status'] === 'completed') {
            $update['completed_at'] = now();
        }

        $requestModel->update($update);

        return response()->json(['data' => $this->transform($requestModel->fresh()->load('apartment'), true)]);
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
            'apartment_number' => $r->apartment?->number,
            'created_at' => $r->created_at->toISOString(),
        ];

        if ($detailed) {
            $data['started_at'] = $r->started_at?->toISOString();
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
