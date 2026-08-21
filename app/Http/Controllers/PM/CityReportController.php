<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\CityReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Mahalla Fix — kommunal idora paneli (Admin View).
 *
 * CityReport'da CompanyScope yo'q, shu sabab kompaniya filtri shu yerda qo'lda qo'llaniladi:
 * super_admin barcha murojaatlarni, qolganlar o'z kompaniyasi + biriktirilmagan (null)
 * murojaatlarni ko'radi.
 */
class CityReportController extends Controller
{
    public function index(Request $request): Response
    {
        $reports = $this->scopedQuery()
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q2) =>
                $q2->where('title', 'like', "%{$s}%")
                   ->orWhere('ticket_code', 'like', "%{$s}%")
                   ->orWhere('address', 'like', "%{$s}%")
            ))
            // Eng yangisi tepada. Prioritet bo'yicha saralash yangi arizani ro'yxat
            // oxiriga tushirib yuborardi — admin uni "kelmagan" deb o'ylardi.
            ->latest()
            ->get()
            ->map(fn (CityReport $r) => $this->transform($r));

        return Inertia::render('PM/CityReports/Index', [
            'reports'          => $reports,
            'categoryLabels'   => CityReport::CATEGORY_LABELS,
            'priorityLabels'   => CityReport::PRIORITY_LABELS,
            'statusLabels'     => CityReport::STATUS_LABELS,
            'filters'          => $request->only(['status', 'category', 'search']),
        ]);
    }

    public function show(CityReport $report): Response
    {
        $this->authorizeReport($report);

        return Inertia::render('PM/CityReports/Show', [
            'report'         => $this->transform($report, true),
            'categoryLabels' => CityReport::CATEGORY_LABELS,
            'priorityLabels' => CityReport::PRIORITY_LABELS,
            'statusLabels'   => CityReport::STATUS_LABELS,
        ]);
    }

    public function updateStatus(Request $request, CityReport $report): RedirectResponse
    {
        $this->authorizeReport($report);

        $data = $request->validate([
            'status'           => ['required', 'in:submitted,in_progress,resolved,rejected'],
            'resolution_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $data['handled_by'] = auth()->id();

        if (in_array($data['status'], ['resolved', 'rejected'], true) && ! $report->resolved_at) {
            $data['resolved_at'] = now();
        }

        // Kompaniya biriktirilmagan murojaatni ko'rgan admin uni o'z kompaniyasiga oladi
        if ($report->company_id === null && auth()->user()->company_id) {
            $data['company_id'] = auth()->user()->company_id;
        }

        $report->update($data);

        return back()->with('success', 'Murojaat holati yangilandi.');
    }

    /** super_admin → hammasi; qolganlar → o'z kompaniyasi + biriktirilmagan (null). */
    protected function scopedQuery()
    {
        $user = auth()->user();

        if ($user->hasRole('super_admin')) {
            return CityReport::query();
        }

        return CityReport::where(fn ($q) =>
            $q->where('company_id', $user->company_id)->orWhereNull('company_id')
        );
    }

    protected function authorizeReport(CityReport $report): void
    {
        $user = auth()->user();

        if ($user->hasRole('super_admin')) {
            return;
        }

        abort_unless(
            $report->company_id === null || $report->company_id === $user->company_id,
            404
        );
    }

    /** @return array<string, mixed> */
    protected function transform(CityReport $r, bool $detailed = false): array
    {
        $data = [
            'id'             => $r->id,
            'ticket_code'    => $r->ticket_code,
            'title'          => $r->title,
            'category'       => $r->category,
            'priority'       => $r->priority,
            'status'         => $r->status,
            'latitude'       => (float) $r->latitude,
            'longitude'      => (float) $r->longitude,
            'address'        => $r->address,
            'reporter_name'  => $r->reporter_name,
            'ai_summary'     => $r->ai_summary,
            'created_at'     => $r->created_at->toISOString(),
        ];

        if ($detailed) {
            $data['description']      = $r->description;
            $data['ai_category']      = $r->ai_category;
            $data['ai_priority']      = $r->ai_priority;
            $data['reporter_username'] = $r->reporter_username;
            $data['resolution_notes'] = $r->resolution_notes;
            $data['resolved_at']      = $r->resolved_at?->toISOString();
            $data['photo_url']        = $r->photo_path ? Storage::url($r->photo_path) : null;
        }

        return $data;
    }
}
