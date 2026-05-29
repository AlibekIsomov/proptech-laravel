<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ScopedBy([CompanyScope::class])]
class UtilityRate extends Model
{
    use HasUuids;
    protected $fillable = [
        'company_id', 'meter_type', 'rate_per_unit', 'currency',
        'effective_from', 'effective_to', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'effective_from' => 'date',
            'effective_to'   => 'date',
            'is_active'      => 'boolean',
            'rate_per_unit'  => 'decimal:4',
        ];
    }

    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
}
