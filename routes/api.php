<?php

use App\Http\Controllers\Api\Resident\AuthController;
use App\Http\Controllers\Api\Resident\DashboardController;
use App\Http\Controllers\Api\Resident\InvoiceController;
use App\Http\Controllers\Api\Resident\MaintenanceController;
use App\Http\Controllers\Api\Resident\PollController;
use App\Http\Middleware\ResidentApiAuth;
use Illuminate\Support\Facades\Route;

// ── Resident Mobile API ───────────────────────────────────────────────────────

Route::prefix('resident')->group(function () {

    // Public — token shart emas
    Route::post('login', [AuthController::class, 'login']);

    // Protected — token kerak
    Route::middleware(ResidentApiAuth::class)->group(function () {
        Route::get('me',      [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);

        Route::get('dashboard', [DashboardController::class, 'index']);

        Route::get('invoices',     [InvoiceController::class, 'index']);
        Route::get('invoices/{id}', [InvoiceController::class, 'show']);

        Route::get('requests',          [MaintenanceController::class, 'index']);
        Route::post('requests',         [MaintenanceController::class, 'store']);
        Route::get('requests/{id}',     [MaintenanceController::class, 'show']);
        Route::post('requests/{id}/rate', [MaintenanceController::class, 'rate']);

        Route::get('polls',            [PollController::class, 'index']);
        Route::post('polls/{id}/vote', [PollController::class, 'vote']);
    });
});
