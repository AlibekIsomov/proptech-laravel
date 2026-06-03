<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove duplicate pm_apartments keeping the earliest created_at per (pm_building_id, number)
        DB::statement("
            DELETE FROM pm_apartments
            WHERE id NOT IN (
                SELECT DISTINCT ON (pm_building_id, number) id
                FROM pm_apartments
                ORDER BY pm_building_id, number, created_at ASC
            )
        ");

        // Add unique constraint to prevent future duplicates
        Schema::table('pm_apartments', function (Blueprint $table) {
            $table->unique(['pm_building_id', 'number'], 'pm_apartments_building_number_unique');
        });
    }

    public function down(): void
    {
        Schema::table('pm_apartments', function (Blueprint $table) {
            $table->dropUnique('pm_apartments_building_number_unique');
        });
    }
};
