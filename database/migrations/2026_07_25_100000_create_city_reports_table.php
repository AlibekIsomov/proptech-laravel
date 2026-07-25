<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('city_reports', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('ticket_code')->unique();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();

            // Murojaat qiluvchi — ro'yxatdan o'tish shart emas (Mahalla Fix boti identifikatori)
            $table->string('reporter_telegram_id')->index();
            $table->string('reporter_name')->nullable();
            $table->string('reporter_username')->nullable();

            // Geolokatsiya (GPS + xarita)
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address')->nullable();

            // Muammo tavsifi
            $table->string('category')->default('other'); // pothole|street_light|water_leak|gas_leak|garbage|other
            $table->string('priority')->default('medium'); // low|medium|high|emergency
            $table->string('title')->nullable();
            $table->text('description')->nullable();

            // AI (Vision) natijasi
            $table->string('ai_category')->nullable();
            $table->string('ai_priority')->nullable();
            $table->text('ai_summary')->nullable();

            $table->string('photo_path')->nullable();
            $table->string('status')->default('submitted'); // submitted|in_progress|resolved|rejected
            $table->text('resolution_notes')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('city_reports');
    }
};
