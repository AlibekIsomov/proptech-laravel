<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[ScopedBy([CompanyScope::class])]
class Project extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'company_id', 'name', 'description', 'location',
        'status', 'total_area', 'total_floors', 'start_date', 'completion_date',
    ];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function buildings(): HasMany   { return $this->hasMany(Building::class); }
    public function apartments(): HasManyThrough {
        return $this->hasManyThrough(Apartment::class, Building::class);
    }
}
