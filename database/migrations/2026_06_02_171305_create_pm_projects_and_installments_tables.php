<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── PM Projects ────────────────────────────────────────────────────────
        Schema::create('pm_projects', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // ── PM Buildings ───────────────────────────────────────────────────────
        Schema::create('pm_buildings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('pm_project_id')->constrained('pm_projects')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('monthly_fee_per_sqm', 8, 2)->default(0);
            $table->timestamps();
        });

        // ── PM Apartments ──────────────────────────────────────────────────────
        Schema::create('pm_apartments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('pm_building_id')->constrained('pm_buildings')->cascadeOnDelete();
            $table->integer('floor');
            $table->string('number');
            $table->integer('rooms')->default(1);
            $table->decimal('area', 8, 2)->nullable();
            $table->timestamps();
        });

        // ── Installment Plans (Sales) ──────────────────────────────────────────
        Schema::create('installment_plans', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('apartment_id')->constrained('apartments')->cascadeOnDelete();
            $table->decimal('total_amount', 14, 2);
            $table->decimal('down_payment', 14, 2)->default(0);
            $table->integer('duration_months');
            $table->decimal('monthly_payment_amount', 14, 2);
            $table->date('start_date');
            $table->string('status')->default('active'); // active | completed | defaulted
            $table->timestamps();
        });

        // ── Installment Payments (Sales) ───────────────────────────────────────
        Schema::create('installment_payments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('installment_plan_id')->constrained('installment_plans')->cascadeOnDelete();
            $table->date('due_date');
            $table->decimal('amount', 14, 2);
            $table->string('status')->default('pending'); // pending | paid | overdue
            $table->date('paid_at')->nullable();
            $table->timestamps();
        });

        // ── Copy Existing Data into PM Tables ──────────────────────────────────
        DB::statement('
            INSERT INTO pm_projects (id, company_id, name, description, location, status, created_at, updated_at)
            SELECT id, company_id, name, description, location, status, created_at, updated_at
            FROM projects
        ');

        DB::statement('
            INSERT INTO pm_buildings (id, pm_project_id, name, monthly_fee_per_sqm, created_at, updated_at)
            SELECT id, project_id, name, 0, created_at, updated_at
            FROM buildings
        ');

        DB::statement('
            INSERT INTO pm_apartments (id, pm_building_id, floor, number, rooms, area, created_at, updated_at)
            SELECT id, building_id, floor, number, rooms, area, created_at, updated_at
            FROM apartments
        ');

        // ── Update PM Core Tables Foreign Keys ─────────────────────────────────
        // Residents table
        Schema::table('residents', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->foreign('apartment_id')->references('id')->on('pm_apartments')->cascadeOnDelete();
        });

        // Maintenance requests
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->foreign('apartment_id')->references('id')->on('pm_apartments')->cascadeOnDelete();
            
            $table->dropForeign(['building_id']);
            $table->foreign('building_id')->references('id')->on('pm_buildings')->nullOnDelete();
        });

        // Invoices
        Schema::table('pm_invoices', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->foreign('apartment_id')->references('id')->on('pm_apartments')->cascadeOnDelete();
        });

        // Communal Assets
        Schema::table('communal_assets', function (Blueprint $table) {
            $table->dropForeign(['building_id']);
            $table->foreign('building_id')->references('id')->on('pm_buildings')->nullOnDelete();
        });
        
        // Polls
        Schema::table('polls', function (Blueprint $table) {
            $table->dropForeign(['building_id']);
            $table->foreign('building_id')->references('id')->on('pm_buildings')->cascadeOnDelete();
        });

        // Assets
        Schema::table('pm_assets', function (Blueprint $table) {
            $table->dropForeign(['building_id']);
            $table->foreign('building_id')->references('id')->on('pm_buildings')->nullOnDelete();
        });

        // Inventories
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropForeign(['building_id']);
            $table->foreign('building_id')->references('id')->on('pm_buildings')->nullOnDelete();
        });

        // Utility Meters
        Schema::table('utility_meters', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->foreign('apartment_id')->references('id')->on('pm_apartments')->cascadeOnDelete();
        });
        
        // Poll Votes
        Schema::table('poll_votes', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->foreign('apartment_id')->references('id')->on('pm_apartments')->cascadeOnDelete();
        });

        // Meter Readings
        Schema::table('meter_readings', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->foreign('apartment_id')->references('id')->on('pm_apartments')->cascadeOnDelete();
        });

        // ── Remove monthly_fee_per_sqm from sales buildings ────────────────────
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropColumn('monthly_fee_per_sqm');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('installment_payments');
        Schema::dropIfExists('installment_plans');
        Schema::dropIfExists('pm_apartments');
        Schema::dropIfExists('pm_buildings');
        Schema::dropIfExists('pm_projects');
    }
};
