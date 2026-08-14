<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_requests', function (Blueprint $table) {
            // Takroriy nosozlik: shu ariza qaysi oldingi (yakunlangan) ta'mirning qaytishi
            $table->foreignUuid('repeat_of_id')->nullable()->constrained('maintenance_requests')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('repeat_of_id');
        });
    }
};
