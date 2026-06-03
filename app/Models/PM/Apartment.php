<?php

namespace App\Models\PM;

use App\Models\MaintenanceRequest;
use App\Models\Resident;
use App\Models\UtilityMeter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Apartment extends Model
{
    use HasUuids;

    protected $table = 'pm_apartments';

    protected $fillable = [
        'pm_building_id', 'floor', 'number', 'rooms', 'area',
    ];

    protected $appends = ['building_id'];
    protected $hidden = ['pm_building_id'];

    public function getBuildingIdAttribute() { return $this->pm_building_id; }
    public function setBuildingIdAttribute($val) { $this->pm_building_id = $val; }

    public function building(): BelongsTo { return $this->belongsTo(Building::class, 'pm_building_id'); }
    
    public function residents(): HasMany { return $this->hasMany(Resident::class, 'apartment_id'); }
    public function activeResidents(): HasMany { return $this->residents()->where('is_active', true); }
    public function meters(): HasMany { return $this->hasMany(UtilityMeter::class, 'apartment_id'); }
    public function invoices(): HasMany { return $this->hasMany(Invoice::class, 'apartment_id'); }
    public function maintenanceRequests(): HasMany { return $this->hasMany(MaintenanceRequest::class, 'apartment_id'); }
}
