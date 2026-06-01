<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeterReading extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'meter_id', 'apartment_id', 'reading_value', 'reading_date',
        'consumption_diff', 'cost_amount', 'source', 'photo_url', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'reading_date'    => 'date',
            'reading_value'   => 'decimal:2',
            'consumption_diff' => 'decimal:2',
            'cost_amount'     => 'decimal:2',
        ];
    }

    public function meter(): BelongsTo      { return $this->belongsTo(UtilityMeter::class, 'meter_id'); }
    public function apartment(): BelongsTo  { return $this->belongsTo(Apartment::class); }
    public function recordedBy(): BelongsTo { return $this->belongsTo(User::class, 'recorded_by'); }
}
