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
    ];

    public function project(): BelongsTo  { return $this->belongsTo(Project::class); }
    public function company(): BelongsTo  { return $this->belongsTo(Company::class)->through('project'); }
    public function apartments(): HasMany { return $this->hasMany(Apartment::class); }
}
