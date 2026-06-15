<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('pm.login');
});

// ── Telegram bot webhook (CSRF dan ozod, bootstrap/app.php ga qarang) ────────
Route::post('telegram/webhook', [\App\Http\Controllers\Telegram\WebhookController::class, 'handle'])
    ->name('telegram.webhook');

// ── Telegram Mini App (Web App) ───────────────────────────────────────────────
Route::get('telegram-app', function () {
    return Inertia::render('TelegramApp/App');
})->name('telegram-app');

Route::prefix('telegram-app/api')
    ->middleware(\App\Http\Middleware\Telegram\AuthenticateWebApp::class)
    ->group(function () {
        Route::get('me', [\App\Http\Controllers\Telegram\WebApp\MeController::class, 'show']);

        Route::get('resident/requests', [\App\Http\Controllers\Telegram\WebApp\Resident\RequestController::class, 'index']);
        Route::post('resident/requests', [\App\Http\Controllers\Telegram\WebApp\Resident\RequestController::class, 'store']);
        Route::get('resident/requests/{requestModel}', [\App\Http\Controllers\Telegram\WebApp\Resident\RequestController::class, 'show']);
        Route::post('resident/requests/{requestModel}/rate', [\App\Http\Controllers\Telegram\WebApp\Resident\RequestController::class, 'rate']);

        Route::get('vendor/requests', [\App\Http\Controllers\Telegram\WebApp\Vendor\RequestController::class, 'index']);
        Route::get('vendor/requests/{requestModel}', [\App\Http\Controllers\Telegram\WebApp\Vendor\RequestController::class, 'show']);
        Route::patch('vendor/requests/{requestModel}/status', [\App\Http\Controllers\Telegram\WebApp\Vendor\RequestController::class, 'updateStatus']);
    });

// ── Public routes (autentifikatsiya shart emas) ──────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('login', [AuthController::class, 'login'])->name('login.post');

    Route::get('pm/login', [AuthController::class, 'showPmLogin'])->name('pm.login');
    Route::post('pm/login', [AuthController::class, 'login'])->name('pm.login.post');
});

// ── Logout ───────────────────────────────────────────────────────────────────
Route::post('logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

// ── Protected routes ──────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    // Sales Dashboard
    Route::get('dashboard', [DashboardController::class, 'index'])
        ->name('dashboard')
        ->middleware('role:super_admin|company_admin|manager|viewer');

    // ── Companies — disabled for frontend (PM only) ────────────────────────
    Route::resource('companies', \App\Http\Controllers\CompanyController::class)
        ->middleware('sales.disabled', 'role:super_admin');

    // ── Users — disabled for frontend (PM only) ────────────────────────────
    Route::resource('users', \App\Http\Controllers\UserController::class)
        ->middleware('sales.disabled', 'role:super_admin|company_admin');

    // ── Sales CRM — disabled for frontend (PM only) ────────────────────────
    Route::middleware('sales.disabled', 'role:super_admin|company_admin|manager|viewer')->group(function () {
        Route::resource('projects', \App\Http\Controllers\ProjectController::class);
        Route::resource('apartments', \App\Http\Controllers\ApartmentController::class);
        Route::resource('clients', \App\Http\Controllers\ClientController::class);

        // Bulk apartment generator
        Route::post('apartments/bulk-generate', [\App\Http\Controllers\ApartmentController::class, 'bulkGenerate'])
            ->name('apartments.bulk-generate');

        // Building Floor Plan APIs
        Route::get('buildings/{building}/floor-plan', [\App\Http\Controllers\ApartmentController::class, 'floorPlan'])
            ->name('buildings.floor-plan');
        Route::post('buildings', [\App\Http\Controllers\ProjectController::class, 'storeBuilding'])
            ->name('buildings.store');
        Route::patch('apartments/{apartment}/status', [\App\Http\Controllers\ApartmentController::class, 'updateStatus'])
            ->name('apartments.update-status');
        Route::patch('apartments/{apartment}/assign-manager', [\App\Http\Controllers\ApartmentController::class, 'assignManager'])
            ->name('apartments.assign-manager');

        // AI Insights
        Route::get('api/ai-insights', [\App\Http\Controllers\DashboardController::class, 'aiInsights'])
            ->name('ai.insights');
        Route::post('api/ai-email', [\App\Http\Controllers\ClientController::class, 'generateEmail'])
            ->name('ai.email');
    });

    // ── Property Management Portal ─────────────────────────────────────────
    Route::middleware('role:super_admin|company_admin|property_manager')
        ->prefix('pm')
        ->name('pm.')
        ->group(function () {
            Route::get('dashboard', [\App\Http\Controllers\PM\DashboardController::class, 'index'])
                ->name('dashboard');
            Route::resource('residents', \App\Http\Controllers\PM\ResidentController::class);
            Route::resource('vendors', \App\Http\Controllers\PM\VendorController::class);
            Route::resource('requests', \App\Http\Controllers\PM\MaintenanceRequestController::class)->parameters(['requests' => 'requestModel']);
            Route::resource('meters', \App\Http\Controllers\PM\UtilityMeterController::class);
            Route::resource('invoices', \App\Http\Controllers\PM\InvoiceController::class);
            Route::resource('polls', \App\Http\Controllers\PM\PollController::class);
            Route::resource('communal', \App\Http\Controllers\PM\CommunalController::class);
            Route::resource('assets', \App\Http\Controllers\PM\AssetController::class);
            Route::resource('inventory', \App\Http\Controllers\PM\InventoryController::class);

            // AI categorization for maintenance requests
            Route::post('requests/{requestModel}/ai-categorize', [\App\Http\Controllers\PM\MaintenanceRequestController::class, 'aiCategorize'])
                ->name('requests.ai-categorize');

            // Meter photo OCR
            Route::post('meters/readings/photo', [\App\Http\Controllers\PM\UtilityMeterController::class, 'photoReading'])
                ->name('meters.photo-reading');

            // Apartment details for drawer
            Route::get('apartments/{apartment}/detail', [\App\Http\Controllers\PM\ApartmentController::class, 'detail'])
                ->name('apartments.detail');

            // ── Projects, Buildings, Apartments management ──────────────────
            Route::resource('projects', \App\Http\Controllers\PM\ProjectController::class);
            Route::post('projects/{project}/buildings', [\App\Http\Controllers\PM\ProjectController::class, 'storeBuilding'])
                ->name('projects.buildings.store');

            // Apartment routes (bulk-generate before resource to avoid conflict)
            Route::post('apartments/bulk-generate', [\App\Http\Controllers\PM\ApartmentController::class, 'bulkGenerate'])
                ->name('apartments.bulk-generate');
            Route::patch('apartments/{apartment}/status', [\App\Http\Controllers\PM\ApartmentController::class, 'updateStatus'])
                ->name('apartments.update-status');
            Route::patch('apartments/{apartment}/assign-manager', [\App\Http\Controllers\PM\ApartmentController::class, 'assignManager'])
                ->name('apartments.assign-manager');
            Route::resource('apartments', \App\Http\Controllers\PM\ApartmentController::class)
                ->only(['store', 'update', 'destroy']);

            // Building floor-plan API (consumed by FloorPlan component)
            Route::get('buildings/{building}/floor-plan', [\App\Http\Controllers\PM\ApartmentController::class, 'floorPlan'])
                ->name('buildings.floor-plan');

            // Monthly fees
            Route::get('monthly-fees', [\App\Http\Controllers\PM\MonthlyFeeController::class, 'index'])
                ->name('monthly-fees.index');
            Route::post('monthly-fees/generate', [\App\Http\Controllers\PM\MonthlyFeeController::class, 'generate'])
                ->name('monthly-fees.generate');
            Route::patch('monthly-fees/{invoice}', [\App\Http\Controllers\PM\MonthlyFeeController::class, 'updateStatus'])
                ->name('monthly-fees.update');
        });

    // ── Dispatcher Portal ──────────────────────────────────────────────────
    Route::middleware('role:super_admin|company_admin|dispatcher')
        ->prefix('dispatcher')
        ->name('dispatcher.')
        ->group(function () {
            Route::get('dashboard', [\App\Http\Controllers\Dispatcher\DashboardController::class, 'index'])
                ->name('dashboard');
        });

    // ── Vendor Portal ──────────────────────────────────────────────────────
    Route::middleware('role:vendor')
        ->prefix('vendor')
        ->name('vendor.')
        ->group(function () {
            Route::get('dashboard', [\App\Http\Controllers\Vendor\DashboardController::class, 'index'])
                ->name('dashboard');
        });

    // ── Resident Portal ────────────────────────────────────────────────────
    Route::middleware('role:resident')
        ->prefix('resident')
        ->name('resident.')
        ->group(function () {
            Route::get('dashboard', [\App\Http\Controllers\Resident\DashboardController::class, 'index'])
                ->name('dashboard');
        });
});
