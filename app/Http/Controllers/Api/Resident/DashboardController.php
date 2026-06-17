<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRequest;
use App\Models\PMInvoice;
use App\Models\Poll;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $request->attributes->get('resident');

        $pendingInvoices = PMInvoice::withoutGlobalScopes()
            ->where('resident_id', $resident->id)
            ->whereIn('status', ['sent', 'pending'])
            ->count();

        $totalDebt = PMInvoice::withoutGlobalScopes()
            ->where('resident_id', $resident->id)
            ->whereIn('status', ['sent', 'pending', 'overdue'])
            ->sum('total_amount');

        $openRequests = MaintenanceRequest::withoutGlobalScopes()
            ->where('resident_id', $resident->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->count();

        $activePolls = Poll::withoutGlobalScopes()
            ->where('building_id', $resident->apartment?->building_id)
            ->where('status', 'active')
            ->count();

        $recentActivity = collect()
            ->merge(
                PMInvoice::withoutGlobalScopes()
                    ->where('resident_id', $resident->id)
                    ->latest()->limit(3)
                    ->get()
                    ->map(fn($i) => [
                        'type'   => 'invoice',
                        'title'  => $i->invoice_number,
                        'status' => $i->status,
                        'date'   => $i->created_at->format('d.m.Y'),
                    ])
            )
            ->merge(
                MaintenanceRequest::withoutGlobalScopes()
                    ->where('resident_id', $resident->id)
                    ->latest()->limit(3)
                    ->get()
                    ->map(fn($r) => [
                        'type'   => 'request',
                        'title'  => $r->title,
                        'status' => $r->status,
                        'date'   => $r->created_at->format('d.m.Y'),
                    ])
            )
            ->sortByDesc('date')
            ->values()
            ->take(5);

        return response()->json(['data' => [
            'pending_invoices' => $pendingInvoices,
            'total_debt'       => (float) $totalDebt,
            'currency'         => 'UZS',
            'open_requests'    => $openRequests,
            'active_polls'     => $activePolls,
            'recent_activity'  => $recentActivity,
        ]]);
    }
}
