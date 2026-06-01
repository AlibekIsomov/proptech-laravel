<?php

namespace App\Http\Controllers;

use App\Models\Apartment;
use App\Models\Client;
use App\Models\MaintenanceRequest;
use App\Models\Project;
use App\Models\Vendor;
use App\Services\ClaudeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        // ── Metrics ────────────────────────────────────────────────────────────
        $totalApts = Apartment::count();
        $soldApts  = Apartment::where('status', 'sold')->count();
        $availApts = Apartment::where('status', 'available')->count();
        $revenue   = Apartment::where('status', 'sold')->sum('price');

        // ── Oylik savdo trendi (so'nggi 7 oy) ─────────────────────────────────
        $monthlySales = Apartment::select(
                DB::raw("TO_CHAR(updated_at, 'Mon') as month"),
                DB::raw("TO_CHAR(updated_at, 'YYYY-MM') as month_key"),
                DB::raw('COUNT(*) as units'),
                DB::raw('SUM(price) / 1000 as revenue')
            )
            ->where('status', 'sold')
            ->where('updated_at', '>=', now()->subMonths(7)->startOfMonth())
            ->groupBy(DB::raw("TO_CHAR(updated_at, 'YYYY-MM')"), DB::raw("TO_CHAR(updated_at, 'Mon')"))
            ->orderBy('month_key')
            ->get()
            ->map(fn ($r) => [
                'month'   => trim($r->month),
                'units'   => (int) $r->units,
                'revenue' => round((float) $r->revenue, 1),
            ])
            ->values();

        // Agar ma'lumot yo'q bo'lsa, bo'sh placeholder
        if ($monthlySales->isEmpty()) {
            $monthlySales = collect([['month' => now()->format('M'), 'units' => 0, 'revenue' => 0]]);
        }

        // ── Loyiha bo'yicha statistika ─────────────────────────────────────────
        $projectData = Project::select('projects.id', 'projects.name')
            ->withCount([
                'apartments as sold'      => fn ($q) => $q->where('apartments.status', 'sold'),
                'apartments as available' => fn ($q) => $q->where('apartments.status', 'available'),
            ])
            ->orderByDesc('sold')
            ->limit(6)
            ->get()
            ->map(fn ($p) => [
                'name'      => $p->name,
                'sold'      => (int) $p->sold,
                'available' => (int) $p->available,
            ])
            ->values();

        // ── Recent transactions (so'nggi 5 ta) ───────────────────────────────
        $transactions = Client::with(['apartment'])
            ->whereIn('status', ['reserved', 'bought'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($c, $i) => [
                'id'        => 'TXN-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                'client'    => $c->full_name,
                'apartment' => $c->apartment ? '№' . $c->apartment->number : '—',
                'amount'    => $c->apartment ? '$' . number_format($c->apartment->price) : '—',
                'date'      => $c->created_at->format('M d'),
                'status'    => $c->status === 'bought' ? 'completed' : 'reserved',
            ]);

        // ── PM quick stats ────────────────────────────────────────────────────
        $pmStats = null;
        if (auth()->user()?->hasAnyRole(['super_admin', 'company_admin', 'property_manager'])) {
            $pmStats = [
                'open_requests' => MaintenanceRequest::where('status', 'open')->count(),
                'vendors'       => Vendor::where('is_active', true)->count(),
            ];
        }

        // ── Notifications (recent client activity) ────────────────────────────
        $notifications = Client::select('id', 'full_name', 'status', 'created_at')
            ->whereNotIn('status', ['new'])
            ->latest()
            ->limit(5)
            ->get();

        return Inertia::render('Dashboard/Index', [
            'metrics' => [
                'totalApts' => $totalApts,
                'soldApts'  => $soldApts,
                'availApts' => $availApts,
                'revenue'   => (float) $revenue,
            ],
            'monthlySales'  => $monthlySales,
            'projectData'   => $projectData,
            'transactions'  => $transactions,
            'notifications' => $notifications,
            'pmStats'       => $pmStats,
        ]);
    }

    /**
     * GET /api/ai-insights
     */
    public function aiInsights(Request $request, ClaudeService $claude): JsonResponse
    {
        $totalApts = Apartment::count();
        $soldApts  = Apartment::where('status', 'sold')->count();
        $availApts = Apartment::where('status', 'available')->count();
        $revenue   = Apartment::where('status', 'sold')->sum('price');

        $prompt = <<<PROMPT
Siz ko'chmas mulk savdosi bo'yicha AI konsultantisiz. Quyidagi savdo ma'lumotlariga asoslanib, 3 ta amaliy tavsiya bering.

Ma'lumotlar:
- Jami kvartiralar: {$totalApts}
- Sotilgan: {$soldApts}
- Mavjud: {$availApts}
- Jami daromad: \${$revenue}

Har bir tavsiyani yangi qatorda, "•" bilan boshlang. Rus tilida yozing. Aniq va qisqa bo'lsin.
PROMPT;

        $text     = $claude->complete($prompt, 512);
        $insights = array_values(array_filter(
            array_map('trim', explode('•', $text)),
            fn ($s) => strlen($s) > 10
        ));

        return response()->json(['insights' => $insights]);
    }
}
