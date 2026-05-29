<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Building;
use App\Models\Apartment;
use App\Models\MaintenanceRequest;
use App\Models\Resident;
use App\Models\PMInvoice;
use App\Models\Vendor;
use App\Models\Poll;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        // ── Load Selector Lists ──────────────────────────────────────────────
        $projects = Project::orderBy('name')->get(['id', 'name']);
        $buildings = Building::orderBy('name')->get(['id', 'name', 'project_id']);

        // Determine selected project and building
        $selectedProj = $request->input('project_id');
        if (!$selectedProj && $projects->isNotEmpty()) {
            $selectedProj = $projects->first()->id;
        }

        $selectedBldg = $request->input('building_id');
        if ($selectedProj && !$selectedBldg) {
            $firstBldg = $buildings->where('project_id', $selectedProj)->first();
            $selectedBldg = $firstBldg ? $firstBldg->id : null;
        }

        // ── Load Chessboard & Specific Metrics ──────────────────────────────
        $apartmentsList = [];
        $metrics = [
            'total_apartments'  => 0,
            'active_residents'  => 0,
            'open_requests'     => 0,
            'overdue_amount'    => 0,
        ];

        if ($selectedBldg) {
            // Load apartments
            $apts = Apartment::where('building_id', $selectedBldg)
                ->orderBy('floor', 'desc')
                ->orderBy('number')
                ->get(['id', 'number', 'floor', 'area', 'rooms']);

            $aptIds = $apts->pluck('id')->toArray();

            if (!empty($aptIds)) {
                // Fetch residents
                $residents = Resident::whereIn('apartment_id', $aptIds)
                    ->where('is_active', true)
                    ->get(['apartment_id', 'full_name']);
                
                $residentByApt = $residents->pluck('full_name', 'apartment_id');

                // Fetch active requests
                $requests = MaintenanceRequest::whereIn('apartment_id', $aptIds)
                    ->whereIn('status', ['open', 'assigned', 'in_progress'])
                    ->get(['apartment_id', 'priority', 'status']);
                
                $requestsByApt = [];
                foreach ($requests as $req) {
                    if (!isset($requestsByApt[$req->apartment_id])) {
                        $requestsByApt[$req->apartment_id] = [
                            'hasEmergency' => false,
                            'count' => 0
                        ];
                    }
                    $requestsByApt[$req->apartment_id]['count']++;
                    if ($req->priority === 'emergency') {
                        $requestsByApt[$req->apartment_id]['hasEmergency'] = true;
                    }
                }

                // Fetch overdue invoices
                $overdueInvoices = PMInvoice::whereIn('apartment_id', $aptIds)
                    ->where('status', 'overdue')
                    ->get(['apartment_id', 'total_amount']);
                
                $overdueByApt = $overdueInvoices->pluck('apartment_id')->unique()->toArray();
                $overdueTotal = $overdueInvoices->sum('total_amount');

                // Compute chessboard
                foreach ($apts as $a) {
                    $hasResident = $residentByApt->has($a->id);
                    $reqInfo = $requestsByApt[$a->id] ?? null;
                    
                    $status = 'empty';
                    if ($hasResident) {
                        if ($reqInfo && $reqInfo['hasEmergency']) {
                            $status = 'emergency';
                        } elseif ($reqInfo && $reqInfo['count'] > 0) {
                            $status = 'open_request';
                        } elseif (in_array($a->id, $overdueByApt)) {
                            $status = 'overdue';
                        } else {
                            $status = 'ok';
                        }
                    }

                    $apartmentsList[] = [
                        'id'            => $a->id,
                        'number'        => $a->number,
                        'floor'         => $a->floor,
                        'size_m2'       => $a->area,
                        'rooms_count'   => $a->rooms,
                        'status'        => $status,
                        'resident_name' => $residentByApt->get($a->id) ?? null,
                    ];
                }

                $metrics = [
                    'total_apartments'  => $apts->count(),
                    'active_residents'  => $residents->count(),
                    'open_requests'     => $requests->count(),
                    'overdue_amount'    => (float) $overdueTotal,
                ];
            }
        }

        return Inertia::render('PM/Dashboard', [
            'projects'      => $projects,
            'buildings'     => $buildings,
            'selectedProj'  => $selectedProj,
            'selectedBldg'  => $selectedBldg,
            'apartments'    => $apartmentsList,
            'metrics'       => $metrics,
        ]);
    }
}
