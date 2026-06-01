<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PMAsset extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $table = 'pm_assets';

    protected $fillable = [
        'building_id', 'name', 'category', 'serial_number', 'manufacturer',
        'installed_at', 'warranty_until', 'next_service_at',
        'service_interval_days', 'location', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return [
            'installed_at'     => 'date',
            'warranty_until'   => 'date',
            'next_service_at'  => 'date',
        ];
    }

    public function building(): BelongsTo { return $this->belongsTo(Building::class); }
}
