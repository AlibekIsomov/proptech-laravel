<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Utility Meters (Hisoblagichlar) ───────────────────────────────────
        Schema::create('utility_meters', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('apartment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('meter_type'); // electricity | gas | water_cold | water_hot | heating
            $table->string('serial_number')->nullable();
            $table->string('unit')->default('kWh');
            $table->date('installed_date')->nullable();
            $table->decimal('initial_reading', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ── Meter Readings (Ko'rsatkichlar) ───────────────────────────────────
        Schema::create('meter_readings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('meter_id')->constrained('utility_meters')->cascadeOnDelete();
            $table->foreignUuid('apartment_id')->constrained()->cascadeOnDelete();
            $table->decimal('reading_value', 12, 2);
            $table->date('reading_date')->default(DB::raw('CURRENT_DATE'));
            $table->decimal('consumption_diff', 12, 2)->nullable();
            $table->decimal('cost_amount', 10, 2)->nullable();
            $table->string('source')->default('manual'); // manual | photo_ai | smart_meter
            $table->string('photo_url')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // ── Utility Rates (Tariflar) ──────────────────────────────────────────
        Schema::create('utility_rates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('meter_type');
            $table->decimal('rate_per_unit', 10, 4);
            $table->string('currency')->default('UZS');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ── PM Invoices (Hisob-fakturalar) ────────────────────────────────────
        Schema::create('pm_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('apartment_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('resident_id')->nullable()->constrained('residents')->nullOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number')->unique();
            $table->date('billing_period_start');
            $table->date('billing_period_end');
            $table->decimal('pm_fee', 10, 2)->default(0);
            $table->decimal('utilities_amount', 10, 2)->default(0);
            $table->decimal('maintenance_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->string('currency')->default('UZS');
            $table->string('status')->default('draft'); // draft | sent | paid | overdue | cancelled
            $table->string('pdf_url')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        // ── Communal Assets (Umumiy Mulk) ─────────────────────────────────────
        Schema::create('communal_assets', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('building_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('asset_type'); // elevator | entrance | parking | playground | common_area | roof | facade | other
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('operational'); // operational | maintenance | broken | retired
            $table->date('last_inspection_date')->nullable();
            $table->date('next_inspection_date')->nullable();
            $table->timestamps();
        });

        // ── PM Assets (Inventar) ──────────────────────────────────────────────
        Schema::create('pm_assets', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('building_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category'); // elevator | pump | boiler | hvac | electrical | plumbing | security | other
            $table->string('serial_number')->nullable();
            $table->string('manufacturer')->nullable();
            $table->date('installed_at')->nullable();
            $table->date('warranty_until')->nullable();
            $table->date('next_service_at')->nullable();
            $table->integer('service_interval_days')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('operational'); // operational | needs_service | broken | retired
            $table->timestamps();
        });

        // ── Inventory Items ───────────────────────────────────────────────────
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('building_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('category')->nullable();
            $table->integer('quantity')->default(0);
            $table->string('unit')->default('pcs');
            $table->integer('min_threshold')->default(0);
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->string('supplier')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Polls (Ovoz Berish) ───────────────────────────────────────────────
        Schema::create('polls', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('building_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('options'); // [{"id": "a", "label": "Za"}, ...]
            $table->string('status')->default('open'); // open | closed | cancelled
            $table->integer('quorum_pct')->default(50);
            $table->timestamp('closes_at')->nullable();
            $table->text('ai_summary')->nullable();
            $table->timestamps();
        });

        // ── Poll Votes ────────────────────────────────────────────────────────
        Schema::create('poll_votes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('poll_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignUuid('apartment_id')->constrained()->cascadeOnDelete();
            $table->string('option_id');
            $table->timestamps();
            $table->unique(['poll_id', 'apartment_id']); // 1 kvartira = 1 ovoz
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poll_votes');
        Schema::dropIfExists('polls');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('pm_assets');
        Schema::dropIfExists('communal_assets');
        Schema::dropIfExists('pm_invoices');
        Schema::dropIfExists('utility_rates');
        Schema::dropIfExists('meter_readings');
        Schema::dropIfExists('utility_meters');
    }
};
