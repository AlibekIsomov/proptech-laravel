<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\PMInvoice;
use App\Models\Apartment;
use App\Models\Resident;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(): Response
    {
        $invoices = PMInvoice::with(['apartment.building', 'resident'])
            ->latest()
            ->get()
            ->map(fn ($i) => [
                'id'                   => $i->id,
                'invoice_number'       => $i->invoice_number,
                'apartment'            => $i->apartment?->number,
                'building'             => $i->apartment?->building?->name,
                'resident'             => $i->resident?->full_name,
                'billing_period_start' => $i->billing_period_start?->format('Y-m-d'),
                'billing_period_end'   => $i->billing_period_end?->format('Y-m-d'),
                'pm_fee'               => $i->pm_fee,
                'utilities_amount'     => $i->utilities_amount,
                'maintenance_amount'   => $i->maintenance_amount,
                'total_amount'         => $i->total_amount,
                'currency'             => $i->currency,
                'status'               => $i->status,
                'due_date'             => $i->due_date?->format('Y-m-d'),
                'sent_at'              => $i->sent_at?->toISOString(),
                'paid_at'              => $i->paid_at?->toISOString(),
            ]);

        $apartments = Apartment::with(['residents' => fn ($q) => $q->where('is_active', true)])
            ->get()->map(fn ($a) => [
                'id'       => $a->id,
                'label'    => "№{$a->number}",
                'residents'=> $a->residents->map(fn ($r) => ['id' => $r->id, 'name' => $r->full_name]),
            ]);

        return Inertia::render('PM/Invoices/Index', compact('invoices', 'apartments'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'apartment_id'         => ['required', 'exists:apartments,id'],
            'resident_id'          => ['nullable', 'exists:residents,id'],
            'billing_period_start' => ['required', 'date'],
            'billing_period_end'   => ['required', 'date', 'after:billing_period_start'],
            'pm_fee'               => ['required', 'numeric', 'min:0'],
            'utilities_amount'     => ['required', 'numeric', 'min:0'],
            'maintenance_amount'   => ['required', 'numeric', 'min:0'],
            'currency'             => ['required', 'string'],
            'due_date'             => ['nullable', 'date'],
        ]);

        $data['total_amount'] = $data['pm_fee'] + $data['utilities_amount'] + $data['maintenance_amount'];
        $data['status']       = 'draft';
        $data['company_id']   = auth()->user()->company_id;
        $data['invoice_number']= 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

        PMInvoice::create($data);

        return back()->with('success', 'Hisob-faktura yaratildi.');
    }

    public function update(Request $request, PMInvoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,sent,paid,overdue,cancelled'],
        ]);

        if ($data['status'] === 'sent' && !$invoice->sent_at) {
            $data['sent_at'] = now();
        }
        if ($data['status'] === 'paid' && !$invoice->paid_at) {
            $data['paid_at'] = now();
        }

        $invoice->update($data);

        return back()->with('success', 'Status yangilandi.');
    }

    public function destroy(PMInvoice $invoice): RedirectResponse
    {
        $invoice->delete();
        return back()->with('success', 'Hisob-faktura o\'chirildi.');
    }

    /**
     * GET /pm/invoices/{invoice}/pdf
     */
    public function downloadPdf(PMInvoice $invoice): HttpResponse
    {
        $invoice->load(['apartment.building.project', 'resident', 'company']);

        $pdf = Pdf::loadView('pdf.invoice', ['invoice' => $invoice])
            ->setPaper('a4', 'portrait');

        return $pdf->download("invoice-{$invoice->invoice_number}.pdf");
    }
}
