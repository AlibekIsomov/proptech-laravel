<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('telegram_chat_id')->nullable()->after('telegram_username');
        });

        // ── Telegram bot conversation sessions ────────────────────────────────
        Schema::create('telegram_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('chat_id')->unique();
            $table->string('telegram_user_id')->nullable();
            $table->string('telegram_username')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->json('resident_ids')->nullable();
            $table->foreignUuid('active_resident_id')->nullable()->constrained('residents')->nullOnDelete();
            $table->foreignUuid('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('active_role')->nullable(); // resident | vendor
            $table->string('state')->default('idle');
            $table->json('context')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_sessions');

        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn('telegram_chat_id');
        });
    }
};
