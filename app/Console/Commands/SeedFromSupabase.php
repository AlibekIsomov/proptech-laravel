<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Exception;

class SeedFromSupabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:seed-from-supabase
                            {--force : Run even if local database is not empty}
                            {--chunk=200 : Number of rows to fetch per batch}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Pull all data from Supabase and seed the local PostgreSQL database. '
        . 'Runs automatically when local DB is empty, or use --force to resync.';

    /**
     * Tables to sync, ordered by foreign-key dependency (parents first).
     * Each entry is either a plain table name or an array with options.
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
        'jobs',
        'failed_jobs',
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔄  1Mahalla — Supabase → Local DB Replication');
        $this->newLine();

        // ── 1. Check Supabase connection ────────────────────────────────────
        try {
            DB::connection('supabase')->getPdo();
            $this->info('✅  Connected to Supabase.');
        } catch (Exception $e) {
            $this->error('❌  Cannot connect to Supabase: ' . $e->getMessage());
            $this->warn('    Check SUPABASE_DB_* variables in your .env file.');
            return self::FAILURE;
        }

        // ── 2. Check local connection ───────────────────────────────────────
        try {
            DB::connection('pgsql')->getPdo();
            $this->info('✅  Connected to local PostgreSQL.');
        } catch (Exception $e) {
            $this->error('❌  Cannot connect to local DB: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->newLine();

        // ── 3. Decide whether to proceed ────────────────────────────────────
        $force = $this->option('force');

        if (! $force) {
            $localCount = $this->countLocalRows('companies');

            if ($localCount > 0) {
                $this->warn("ℹ️   Local database already has {$localCount} company record(s).");
                $this->warn('    Use --force to overwrite / resync anyway.');
                $this->newLine();
                $this->info('✅  Nothing to do. Local DB is already populated.');
                return self::SUCCESS;
            }

            $this->info('📭  Local database is empty. Starting full replication from Supabase…');
        } else {
            $this->warn('⚠️   --force flag detected. Resyncing ALL tables regardless of local data.');
        }

        $this->newLine();

        // ── 4. Disable FK constraints on local DB during bulk insert ────────
        DB::connection('pgsql')->statement('SET session_replication_role = replica;');

        $chunkSize = (int) $this->option('chunk');
        $errors    = [];

        // ── 5. Iterate tables ───────────────────────────────────────────────
        foreach ($this->tables as $table) {
            // Skip tables that don't exist on local yet (e.g. not migrated)
            if (! $this->localTableExists($table)) {
                $this->line("  ⏭  <comment>{$table}</comment> — not found locally, skipping.");
                continue;
            }

            // Skip tables that don't exist on Supabase
            if (! $this->supabaseTableExists($table)) {
                $this->line("  ⏭  <comment>{$table}</comment> — not found on Supabase, skipping.");
                continue;
            }

            try {
                $total = $this->syncTable($table, $chunkSize, $force);
                $this->line("  ✅  <info>{$table}</info> — {$total} row(s) synced.");
            } catch (Exception $e) {
                $msg = "  ❌  {$table} — " . $e->getMessage();
                $this->error($msg);
                Log::error("SeedFromSupabase: {$table}", ['error' => $e->getMessage()]);
                $errors[] = $table;
            }
        }

        // ── 6. Re-enable FK constraints ─────────────────────────────────────
        DB::connection('pgsql')->statement('SET session_replication_role = DEFAULT;');

        $this->newLine();

        if (empty($errors)) {
            $this->info('🎉  Replication complete! Local database is now in sync with Supabase.');
            Log::info('SeedFromSupabase: Full replication completed successfully.');
            return self::SUCCESS;
        }

        $this->warn('⚠️  Completed with errors in tables: ' . implode(', ', $errors));
        $this->warn('    Check storage/logs/laravel.log for details.');
        return self::FAILURE;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Sync a single table from Supabase → local.
     * Returns the total number of rows processed.
     */
    protected function syncTable(string $table, int $chunkSize, bool $force): int
    {
        $primaryKey = $this->guessPrimaryKey($table);
        $total      = 0;

        // If forcing, truncate local table first so we start clean
        if ($force) {
            DB::connection('pgsql')->table($table)->truncate();
        }

        // Stream rows from Supabase in chunks to avoid memory exhaustion
        DB::connection('supabase')
            ->table($table)
            ->orderBy($primaryKey)
            ->chunk($chunkSize, function ($rows) use ($table, $primaryKey, &$total) {
                $data = $rows->map(fn($row) => (array) $row)->toArray();

                if (empty($data)) {
                    return;
                }

                // Use upsert so re-running won't duplicate rows
                DB::connection('pgsql')
                    ->table($table)
                    ->upsert($data, [$primaryKey]);

                $total += count($data);
            });

        return $total;
    }

    /**
     * Count rows in a local table (returns 0 if table doesn't exist).
     */
    protected function countLocalRows(string $table): int
    {
        try {
            return DB::connection('pgsql')->table($table)->count();
        } catch (Exception) {
            return 0;
        }
    }

    /**
     * Check whether a table exists in the local database.
     */
    protected function localTableExists(string $table): bool
    {
        try {
            return Schema::connection('pgsql')->hasTable($table);
        } catch (Exception) {
            return false;
        }
    }

    /**
     * Check whether a table exists in Supabase.
     */
    protected function supabaseTableExists(string $table): bool
    {
        try {
            return Schema::connection('supabase')->hasTable($table);
        } catch (Exception) {
            return false;
        }
    }

    /**
     * Guess the primary key column name for a given table.
     * Defaults to 'id'; handles pivot tables with composite keys.
     */
    protected function guessPrimaryKey(string $table): string
    {
        $pivotPrimaryKeys = [
            'model_has_roles'        => 'role_id',
            'model_has_permissions'  => 'permission_id',
            'role_has_permissions'   => 'permission_id',
        ];

        return $pivotPrimaryKeys[$table] ?? 'id';
    }
}
