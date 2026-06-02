<?php

namespace App\Models;

use App\Models\PM\Apartment;
use App\Models\PM\Building;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ScopedBy([CompanyScope::class])]
class InventoryItem extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'company_id', 'building_id', 'name', 'category',
        'quantity', 'unit', 'min_threshold', 'unit_cost', 'supplier', 'notes',
        'image_path',
    ];

    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return ['unit_cost' => 'decimal:2'];
    }

    protected function imageUrl(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            get: fn () => $this->image_path ? \Illuminate\Support\Facades\Storage::url($this->image_path) : null,
        );
    }
    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function building(): BelongsTo { return $this->belongsTo(Building::class); }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_threshold;
    }
}

