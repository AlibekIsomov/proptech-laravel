<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ScopedBy([CompanyScope::class])]
class InventoryItem extends Model
{
    use HasUuids;
    protected $fillable = [
        'company_id', 'building_id', 'name', 'category',
        'quantity', 'unit', 'min_threshold', 'unit_cost', 'supplier', 'notes',
    ];

    protected function casts(): array
    {
        return ['unit_cost' => 'decimal:2'];
    }

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function building(): BelongsTo { return $this->belongsTo(Building::class); }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_threshold;
    }
}
