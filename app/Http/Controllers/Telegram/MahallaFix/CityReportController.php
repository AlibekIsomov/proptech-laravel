<?php

namespace App\Http\Controllers\Telegram\MahallaFix;

use App\Http\Controllers\Controller;
use App\Jobs\Telegram\NotifyCityReportCreated;
use App\Models\CityReport;
use App\Services\ClaudeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Mahalla Fix Mini App — fuqarolarning shahar muammolari haqidagi murojaatlari.
 * AuthenticateMahallaWebApp middleware'i tekshirilgan Telegram foydalanuvchisini
 * $request->attributes 'telegramUser' ostiga bog'laydi (resident bo'lishi shart emas).
 */
class CityReportController extends Controller
{
    /** GET /mahalla-fix/api/reports — shu foydalanuvchining o'z murojaatlari. */
    public function index(Request $request): JsonResponse
    {
        $telegramId = (string) $this->telegramUser($request)['id'];

        $reports = CityReport::where('reporter_telegram_id', $telegramId)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CityReport $r) => $this->transform($r));

        return response()->json(['data' => $reports]);
    }

    /** POST /mahalla-fix/api/reports — yangi murojaat: foto + GPS → Vision AI → ticket → kanalga. */
    public function store(Request $request, ClaudeService $ai): JsonResponse
    {
        $user = $this->telegramUser($request);

        $data = $request->validate([
            'latitude'    => ['required', 'numeric', 'between:-90,90'],
            'longitude'   => ['required', 'numeric', 'between:-180,180'],
            'photo'       => ['required', 'image', 'max:5120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category'    => ['nullable', Rule::in(array_keys(CityReport::CATEGORY_LABELS))],
            'address'     => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('photo');
        $path = $file->store('city-reports', 'public');

        $analysis = $ai->analyzeImage(
            Storage::disk('public')->path($path),
            $file->getMimeType() ?? 'image/jpeg',
        );

        $report = CityReport::create([
            'reporter_telegram_id' => (string) $user['id'],
            'reporter_name'        => trim(($user['first_name'] ?? '').' '.($user['last_name'] ?? '')) ?: null,
            'reporter_username'    => $user['username'] ?? null,
            'latitude'    => $data['latitude'],
            'longitude'   => $data['longitude'],
            'address'     => $data['address'] ?? null,
            'category'    => $data['category'] ?? ($analysis['category'] ?? 'other'),
            'priority'    => $analysis['priority'] ?? 'medium',
            'title'       => $analysis['title'] ?? 'Infratuzilma muammosi',
            'description' => $data['description'] ?? null,
            'ai_category' => $analysis['category'] ?? null,
            'ai_priority' => $analysis['priority'] ?? null,
            'ai_summary'  => $analysis['summary'] ?? null,
            'photo_path'  => $path,
            'status'      => 'submitted',
        ]);

        NotifyCityReportCreated::dispatch($report->id);

        return response()->json(['data' => $this->transform($report->fresh(), true)], 201);
    }

    /** GET /mahalla-fix/api/reports/{report} — status kuzatish (faqat egasi). */
    public function show(Request $request, CityReport $report): JsonResponse
    {
        $telegramId = (string) $this->telegramUser($request)['id'];

        abort_unless($report->reporter_telegram_id === $telegramId, 404);

        return response()->json(['data' => $this->transform($report, true)]);
    }

    /** @return array<string, mixed> */
    protected function telegramUser(Request $request): array
    {
        return (array) $request->attributes->get('telegramUser');
    }

    /** @return array<string, mixed> */
    protected function transform(CityReport $r, bool $detailed = false): array
    {
        $data = [
            'id'             => $r->id,
            'ticket_code'    => $r->ticket_code,
            'title'          => $r->title,
            'category'       => $r->category,
            'category_label' => CityReport::categoryLabel($r->category),
            'priority'       => $r->priority,
            'priority_label' => CityReport::priorityLabel($r->priority),
            'status'         => $r->status,
            'status_label'   => CityReport::statusLabel($r->status),
            'latitude'       => (float) $r->latitude,
            'longitude'      => (float) $r->longitude,
            'created_at'     => $r->created_at->toISOString(),
        ];

        if ($detailed) {
            $data['description']      = $r->description;
            $data['ai_summary']       = $r->ai_summary;
            $data['address']          = $r->address;
            $data['resolution_notes'] = $r->resolution_notes;
            $data['resolved_at']      = $r->resolved_at?->toISOString();
            $data['photo_url']        = $r->photo_path ? Storage::url($r->photo_path) : null;
        }

        return $data;
    }
}
