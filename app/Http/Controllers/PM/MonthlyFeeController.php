<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\PM\Apartment;
use App\Models\PMInvoice;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MonthlyFeeController extends Controller
{
    public function index(Request $request): Response
    {
        $buildings = \App\Models\PM\Building::orderBy('name')->get()->map(fn($b) => [
            'id'            => $b->id,
            'name'          => $b->name,
            'pm_project_id' => $b->pm_project_id,
        ])->values();

        $selectedBldg = $request->input('building_id');
        $month        = $request->input('month', now()->format('Y-m'));

        [$year, $mon] = explode('-', $month);
        $startDate = Carbon::createFromDate((int)$year, (int)$mon, 1)->startOfMonth();
        $endDate   = $startDate->copy()->endOfMonth();

        $fees = PMInvoice::with([
                'apartment.building',
                'apartment.residents' => fn($q) => $q->where('is_active', true),
            ])
            ->where('billing_period_start', $startDate->toDateString())
            ->when($selectedBldg, fn($q) =>
                $q->whereHas('apartment', fn($q2) => $q2->where('pm_building_id', $selectedBldg))
            )
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($i) => [
                'id'             => $i->id,
                'invoice_number' => $i->invoice_number,
                'apartment_id'   => $i->apartment_id,
                'apartment'      => $i->apartment?->number,
                'building'       => $i->apartment?->building?->name,
                'building_id'    => $i->apartment?->pm_building_id,
                'resident'       => $i->apartment?->residents?->first()?->full_name,
                'month'          => $i->billing_period_start?->format('Y-m'),
                'amount'         => (float) $i->total_amount,
                'status'         => $i->status,
                'due_date'       => $i->due_date?->format('Y-m-d'),
                'paid_at'        => $i->paid_at?->toISOString(),
            ]);

        $paidCount   = $fees->where('status', 'paid')->count();
        $unpaidCount = $fees->whereIn('status', ['draft', 'overdue'])->count();

        return Inertia::render('PM/MonthlyFees/Index', [
            'buildings'    => $buildings,
            'selectedBldg' => $selectedBldg,
            'month'        => $month,
            'fees'         => $fees->values(),
            'summary'      => [
                'total_count'  => $fees->count(),
                'paid_count'   => $paidCount,
                'unpaid_count' => $unpaidCount,
                'total_amount' => (float) $fees->sum('amount'),
                'paid_amount'  => (float) $fees->where('status', 'paid')->sum('amount'),
                'unpaid_amount'=> (float) $fees->whereIn('status', ['draft', 'overdue'])->sum('amount'),
            ],
        ]);
    }

    public function generate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'month'       => ['required', 'date_format:Y-m'],
            'building_id' => ['nullable', 'exists:pm_buildings,id'],
        ]);

        [$year, $mon] = explode('-', $data['month']);
        $startDate = Carbon::createFromDate((int)$year, (int)$mon, 1)->startOfMonth();
        $endDate   = $startDate->copy()->endOfMonth();
        $companyId = auth()->user()->company_id;

        // All apartments (occupied or not) pay monthly fees
        $query = Apartment::with(['building'])->whereHas('building');

        if (!empty($data['building_id'])) {
            $query->where('pm_building_id', $data['building_id']);
        }

        $apartments = $query->get();

        $existingAptIds = PMInvoice::where('billing_period_start', $startDate->toDateString())
            ->whereIn('apartment_id', $apartments->pluck('id'))
            ->pluck('apartment_id')
            ->toArray();

        $created = 0;
        foreach ($apartments as $apt) {
            if (in_array($apt->id, $existingAptIds)) continue;

            $feePerSqm = (float) ($apt->building?->monthly_fee_per_sqm ?? 0);
            $area      = (float) ($apt->area ?? 0);
            $fee       = round($feePerSqm * $area, 2);

            if ($fee <= 0) continue;

            PMInvoice::create([
                'apartment_id'         => $apt->id,
                'resident_id'          => null,
                'company_id'           => $companyId,
                'invoice_number'       => 'MF-' . $year . $mon . '-' . strtoupper(Str::random(5)),
                'billing_period_start' => $startDate->toDateString(),
                'billing_period_end'   => $endDate->toDateString(),
                'pm_fee'               => $fee,
                'utilities_amount'     => 0,
                'maintenance_amount'   => 0,
                'total_amount'         => $fee,
                'status'               => 'draft',
                'due_date'             => $endDate->toDateString(),
            ]);

            $created++;
        }

        $skipped = count($existingAptIds);
        $msg = "{$created} ta oylik to'lov yaratildi" .
               ($skipped > 0 ? ", {$skipped} ta allaqachon mavjud edi" : '');

        return back()->with('success', $msg);
    }

    public function updateStatus(Request $request, PMInvoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,paid,overdue,cancelled'],
        ]);

        if ($data['status'] === 'paid' && !$invoice->paid_at) {
            $data['paid_at'] = now();
        }
        if ($data['status'] !== 'paid') {
            $data['paid_at'] = null;
        }

        $invoice->update($data);

        return back()->with('success', 'To\'lov holati yangilandi.');
    }
}
