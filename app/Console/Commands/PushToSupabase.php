<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Exception;

class PushToSupabase extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'db:push-to-supabase
                            {--force : Overwrite existing Supabase data (truncate + reinsert)}
                            {--chunk=200 : Number of rows to insert per batch}
                            {--tables= : Comma-separated list of specific tables to sync}';

    /**
     * The console command description.
     */
    protected $description = 'Push ALL local PostgreSQL data → Supabase. '
        . 'Use after initial setup or when local DB has newer data than Supabase.';

    /**
     * Tables to sync, ordered by foreign-key dependency (parents first).
     */
    protected array $tables = [
        'companies',
        'users',
        'projects',
        'buildings',
        'apartments',
        'clients',
        'residents',
        'vendors',
        'inventory_items',
        'maintenance_requests',
        'maintenance_photos',
        'pm_assets',
        'communal_assets',
        'utility_meters',
        'utility_rates',
        'meter_readings',
        'pm_invoices',
        'polls',
        'poll_votes',
        // Laravel built-ins
        'roles',
        'permissions',
        'model_has_roles',
        'model_has_permissions',
        'role_has_permissions',
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🚀  1Mahalla — Local DB → Supabase Push');
        $this->newLine();

        // ── 1. Check local connection ────────────────────────────────────────
        try {
            DB::connection('pgsql')->getPdo();
            $this->info('✅  Connected to local PostgreSQL.');
        } catch (Exception $e) {
            $this->error('❌  Cannot connect to local DB: ' . $e->getMessage());
            return self::FAILURE;
        }

        // ── 2. Check Supabase connection ─────────────────────────────────────
        try {
            DB::connection('supabase')->getPdo();
            $this->info('✅  Connected to Supabase.');
        } catch (Exception $e) {
            $this->error('❌  Cannot connect to Supabase: ' . $e->getMessage());
            $this->warn('    Check SUPABASE_DB_* variables in your .env file.');
            return self::FAILURE;
        }

        $this->newLine();

        $force     = $this->option('force');
        $chunkSize = (int) $this->option('chunk');
        $only      = $this->option('tables')
            ? array_map('trim', explode(',', $this->option('tables')))
            : null;

        $tables = $only ?? $this->tables;

        if ($force) {
            $this->warn('⚠️   --force flag: Supabase tables will be truncated before insert.');
        }

        // ── 3. Disable FK constraints on Supabase during bulk insert ─────────
        DB::connection('supabase')->statement('SET session_replication_role = replica;');

        $errors = [];
        $totalRows = 0;

        // ── 4. Iterate tables ────────────────────────────────────────────────
        foreach ($tables as $table) {
            if (! Schema::connection('pgsql')->hasTable($table)) {
                $this->line("  ⏭  <comment>{$table}</comment> — local da mavjud emas, o'tkazildi.");
                continue;
            }

            try {
                $count = $this->pushTable($table, $chunkSize, $force);
                $totalRows += $count;
                $this->line("  ✅  <info>{$table}</info> — {$count} qator yuborildi.");
            } catch (Exception $e) {
                $msg = "  ❌  {$table} — " . $e->getMessage();
                $this->error($msg);
                Log::error("PushToSupabase: {$table}", ['error' => $e->getMessage()]);
                $errors[] = $table;
            }
        }

        // ── 5. Reset Supabase sequences ───────────────────────────────────────
        try {
            $this->resetSupabaseSequences($tables);
        } catch (Exception $e) {
            $this->warn('⚠️  Sequences reset failed: ' . $e->getMessage());
        }

        // ── 6. Re-enable FK constraints ───────────────────────────────────────
        DB::connection('supabase')->statement('SET session_replication_role = DEFAULT;');

        $this->newLine();

        if (empty($errors)) {
            $this->info("🎉  Push yakunlandi! Jami {$totalRows} qator Supabasega yuborildi.");
            $this->newLine();
            $this->info('👉  Endi prodda: docker compose exec -T app php artisan db:seed-from-supabase --force');
            Log::info("PushToSupabase: Completed. {$totalRows} rows pushed.");
            return self::SUCCESS;
        }

        $this->warn('⚠️  Xatolar bilan yakunlandi: ' . implode(', ', $errors));
        return self::FAILURE;
    }

    /**
     * Push a single table from local → Supabase.
     */
    protected function pushTable(string $table, int $chunkSize, bool $force): int
    {
        $primaryKey = $this->guessPrimaryKey($table);
        $total = 0;

        if ($force) {
            DB::connection('supabase')->table($table)->truncate();
        }

        DB::connection('pgsql')
            ->table($table)
            ->orderBy($primaryKey)
            ->chunk($chunkSize, function ($rows) use ($table, $primaryKey, &$total) {
                $data = $rows->map(fn($row) => (array) $row)->toArray();

                if (empty($data)) {
                    return;
                }

                DB::connection('supabase')
                    ->table($table)
                    ->upsert($data, $this->getUpsertKeys($table));

                $total += count($data);
            });

        return $total;
    }

    /**
     * Get the unique key columns used for upserting.
     */
    protected function getUpsertKeys(string $table): array
    {
        $pivotUpsertKeys = [
            'model_has_roles'       => ['role_id', 'model_id', 'model_type'],
            'model_has_permissions' => ['permission_id', 'model_id', 'model_type'],
            'role_has_permissions'  => ['permission_id', 'role_id'],
        ];

        return $pivotUpsertKeys[$table] ?? [$this->guessPrimaryKey($table)];
    }

    /**
     * Guess the primary key column name for a given table.
     */
    protected function guessPrimaryKey(string $table): string
    {
        $pivotPrimaryKeys = [
            'model_has_roles'       => 'role_id',
            'model_has_permissions' => 'permission_id',
            'role_has_permissions'  => 'permission_id',
        ];

        return $pivotPrimaryKeys[$table] ?? 'id';
    }

    /**
     * Reset Supabase sequences after bulk insert.
     */
    protected function resetSupabaseSequences(array $tables): void
    {
        $this->line('🔄  Supabase sequences yangilanmoqda...');

        foreach ($tables as $table) {
            $primaryKey = $this->guessPrimaryKey($table);
            if ($primaryKey !== 'id') {
                continue;
            }

            try {
                $result = DB::connection('supabase')->select("
                    SELECT pg_get_serial_sequence(:table, :col) as seq
                ", ['table' => $table, 'col' => 'id']);

                $sequence = $result[0]->seq ?? null;

                if ($sequence) {
                    DB::connection('supabase')->statement("
                        SELECT setval(?, COALESCE((SELECT max(id) FROM \"{$table}\"), 0) + 1, false)
                    ", [$sequence]);
                }
            } catch (Exception $e) {
                Log::warning("Could not reset Supabase sequence for {$table}: " . $e->getMessage());
            }
        }

        $this->line('✅  Sequences yangilandi.');
    }
}
