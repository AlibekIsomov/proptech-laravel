<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Vendors (Pudratchilar) ─────────────────────────────────────────────
        Schema::create('vendors', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('telegram_username')->nullable();
            $table->json('specializations')->default('[]');
            $table->decimal('rating', 3, 2)->default(0.00);
            $table->integer('total_jobs')->default(0);
            $table->integer('completed_jobs')->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Residents (Yashovchilar) ───────────────────────────────────────────
        Schema::create('residents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('apartment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('full_name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('telegram_username')->nullable();
            $table->string('telegram_chat_id')->nullable();
            $table->string('resident_type')->default('owner'); // owner | tenant | family
            $table->date('move_in_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ── Maintenance Requests (Nosozlik Arizalari) ─────────────────────────
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('apartment_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('building_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('resident_id')->nullable()->constrained('residents')->nullOnDelete();
            $table->string('category')->nullable(); // plumbing | electrical | heating | cleaning | elevator | appliance | structural | other
            $table->string('priority')->default('medium'); // low | medium | high | emergency
            $table->string('status')->default('open'); // open | assigned | in_progress | completed | cancelled
            $table->string('title');
            $table->text('description');
            $table->string('ai_category_suggested')->nullable();
            $table->string('ai_priority_suggested')->nullable();
            $table->text('ai_summary')->nullable();
            $table->foreignUuid('assigned_vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('assigned_dispatcher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sla_deadline')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->decimal('cost_amount', 10, 2)->nullable();
            $table->integer('resident_rating')->nullable();
            $table->text('resident_feedback')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // ── Maintenance Photos ─────────────────────────────────────────────────
        Schema::create('maintenance_photos', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('request_id')->constrained('maintenance_requests')->cascadeOnDelete();
            $table->string('photo_url');
            $table->string('photo_type')->default('before'); // before | during | after
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_photos');
        Schema::dropIfExists('maintenance_requests');
        Schema::dropIfExists('residents');
        Schema::dropIfExists('vendors');
    }
};
