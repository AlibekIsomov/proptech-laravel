<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Building extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'project_id', 'name', 'floors', 'apartments_per_floor', 'status',
        'monthly_fee_per_sqm',
    ];

    protected function casts(): array
    {
        return [
            'monthly_fee_per_sqm' => 'decimal:2',
        ];
    }

    public function project(): BelongsTo  { return $this->belongsTo(Project::class); }
    public function company(): BelongsTo  { return $this->belongsTo(Company::class)->through('project'); }
    public function apartments(): HasMany { return $this->hasMany(Apartment::class); }
    public function polls(): HasMany      { return $this->hasMany(Poll::class); }
    public function pmAssets(): HasMany   { return $this->hasMany(PMAsset::class); }
    public function communalAssets(): HasMany { return $this->hasMany(CommunalAsset::class); }
    public function residents(): HasMany  { return $this->hasManyThrough(Resident::class, Apartment::class); }
}
