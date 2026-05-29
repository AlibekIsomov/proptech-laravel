<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Projects ──────────────────────────────────────────────────────────
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('status')->default('active'); // active | completed | paused
            $table->decimal('total_area', 12, 2)->nullable();
            $table->integer('total_floors')->nullable();
            $table->date('start_date')->nullable();
            $table->date('completion_date')->nullable();
            $table->timestamps();
        });

        // ── Buildings ─────────────────────────────────────────────────────────
        Schema::create('buildings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('floors')->default(1);
            $table->integer('apartments_per_floor')->default(4);
            $table->string('status')->default('under_construction');
            $table->timestamps();
        });

        // ── Apartments ────────────────────────────────────────────────────────
        Schema::create('apartments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('building_id')->constrained()->cascadeOnDelete();
            $table->integer('floor');
            $table->string('number');
            $table->integer('rooms')->default(1);
            $table->decimal('area', 8, 2)->nullable();
            $table->decimal('price', 14, 2)->nullable();
            $table->string('status')->default('available'); // available | reserved | sold
            $table->string('type')->nullable(); // studio | 1br | 2br | 3br | penthouse
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Clients ───────────────────────────────────────────────────────────
        Schema::create('clients', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('full_name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('status')->default('new'); // new | contacted | viewing | reserved | bought
            $table->decimal('budget_usd', 12, 2)->nullable();
            $table->string('source')->nullable(); // instagram | referral | website | walk_in
            $table->text('notes')->nullable();
            $table->foreignUuid('apartment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
        Schema::dropIfExists('apartments');
        Schema::dropIfExists('buildings');
        Schema::dropIfExists('projects');
    }
};
