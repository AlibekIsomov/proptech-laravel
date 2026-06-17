<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\PMInvoice;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $request->attributes->get('resident');

        $invoices = PMInvoice::withoutGlobalScopes()
            ->where('resident_id', $resident->id)
            ->latest()
            ->get()
            ->map(fn($i) => $this->invoiceData($i));

        return response()->json(['data' => $invoices]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $resident = $request->attributes->get('resident');

        $invoice = PMInvoice::withoutGlobalScopes()
            ->where('id', $id)
            ->where('resident_id', $resident->id)
            ->firstOrFail();

        return response()->json(['data' => $this->invoiceData($invoice)]);
    }

    private function invoiceData(PMInvoice $i): array
    {
        return [
            'id'                   => $i->id,
            'invoice_number'       => $i->invoice_number,
            'status'               => $i->status,
            'pm_fee'               => (float) $i->pm_fee,
            'utilities_amount'     => (float) $i->utilities_amount,
            'maintenance_amount'   => (float) $i->maintenance_amount,
            'total_amount'         => (float) $i->total_amount,
            'currency'             => $i->currency ?? 'UZS',
            'billing_period_start' => $i->billing_period_start?->format('Y-m-d'),
            'billing_period_end'   => $i->billing_period_end?->format('Y-m-d'),
            'due_date'             => $i->due_date?->format('Y-m-d'),
            'paid_at'              => $i->paid_at?->toISOString(),
        ];
    }
}
