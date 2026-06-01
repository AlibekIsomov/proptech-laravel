<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class SyncModelToSupabase implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 5;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var array
     */
    public $backoff = [10, 30, 60, 120, 300];

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected string $modelClass,
        protected array $attributes,
        protected string $action // 'upsert' or 'delete'
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $model = new $this->modelClass;
            $table = $model->getTable();
            $primaryKey = $model->getKeyName();

            if ($this->action === 'upsert') {
                DB::connection('supabase')->table($table)->upsert(
                    $this->attributes,
                    [$primaryKey]
                );
            } elseif ($this->action === 'delete') {
                DB::connection('supabase')->table($table)
                    ->where($primaryKey, $this->attributes[$primaryKey])
                    ->delete();
            }
        } catch (Exception $e) {
            Log::error("Supabase replication failed for {$this->modelClass}: " . $e->getMessage(), [
                'model' => $this->modelClass,
                'action' => $this->action,
                'attributes' => $this->attributes
            ]);
            throw $e;
        }
    }
}
