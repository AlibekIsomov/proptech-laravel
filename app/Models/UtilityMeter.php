<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[ScopedBy([CompanyScope::class])]
class UtilityMeter extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'apartment_id', 'company_id', 'meter_type', 'serial_number',
        'unit', 'installed_date', 'initial_reading', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active'       => 'boolean',
            'installed_date'  => 'date',
            'initial_reading' => 'decimal:2',
        ];
    }

    public function apartment(): BelongsTo { return $this->belongsTo(Apartment::class); }
    public function readings(): HasMany    { return $this->hasMany(MeterReading::class, 'meter_id'); }
    public function latestReading()        { return $this->readings()->latest('reading_date')->first(); }
}
