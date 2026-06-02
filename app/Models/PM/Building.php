<?php

namespace App\Models\PM;

use App\Models\CommunalAsset;
use App\Models\InventoryItem;
use App\Models\MaintenanceRequest;
use App\Models\PMAsset;
use App\Models\Poll;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Building extends Model
{
    use HasUuids;

    protected $table = 'pm_buildings';

    protected $fillable = [
        'pm_project_id', 'name', 'monthly_fee_per_sqm',
    ];

    protected $appends = ['project_id'];
    protected $hidden = ['pm_project_id'];

    public function getProjectIdAttribute() { return $this->pm_project_id; }
    public function setProjectIdAttribute($val) { $this->pm_project_id = $val; }

    public function project(): BelongsTo { return $this->belongsTo(Project::class, 'pm_project_id'); }
    public function apartments(): HasMany { return $this->hasMany(Apartment::class, 'pm_building_id'); }
    
    public function communalAssets(): HasMany { return $this->hasMany(CommunalAsset::class, 'building_id'); }
    public function assets(): HasMany { return $this->hasMany(PMAsset::class, 'building_id'); }
    public function inventoryItems(): HasMany { return $this->hasMany(InventoryItem::class, 'building_id'); }
    public function maintenanceRequests(): HasMany { return $this->hasMany(MaintenanceRequest::class, 'building_id'); }
    public function polls(): HasMany { return $this->hasMany(Poll::class, 'building_id'); }
}
