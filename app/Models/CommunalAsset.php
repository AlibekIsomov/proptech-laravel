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
class CommunalAsset extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'building_id', 'company_id', 'asset_type', 'name',
        'description', 'status', 'last_inspection_date', 'next_inspection_date',
    ];

    protected function casts(): array
    {
        return [
            'last_inspection_date' => 'date',
            'next_inspection_date' => 'date',
        ];
    }

    public function building(): BelongsTo { return $this->belongsTo(Building::class); }
}

