<?php

namespace App\Traits;

use App\Jobs\SyncModelToSupabase;

trait SyncsToSupabase
{
    /**
     * Boot the trait and register Eloquent event listeners.
     */
    public static function bootSyncsToSupabase(): void
    {
        static::saved(function ($model) {
            if (config('database.sync_to_supabase', true)) {
                SyncModelToSupabase::dispatch(
                    get_class($model),
                    $model->getAttributes(),
                    'upsert'
                );
            }
        });

        static::deleted(function ($model) {
            if (config('database.sync_to_supabase', true)) {
                SyncModelToSupabase::dispatch(
                    get_class($model),
                    [$model->getKeyName() => $model->getKey()],
                    'delete'
                );
            }
        });
    }
}
