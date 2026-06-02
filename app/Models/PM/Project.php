<?php

namespace App\Models\PM;

use App\Models\Company;
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
    use HasUuids;

    protected $table = 'pm_projects';

    protected $fillable = [
        'company_id', 'name', 'description', 'location', 'status',
    ];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function buildings(): HasMany   { return $this->hasMany(Building::class, 'pm_project_id'); }
    public function apartments(): HasManyThrough {
        return $this->hasManyThrough(Apartment::class, Building::class, 'pm_project_id', 'pm_building_id');
    }
}
