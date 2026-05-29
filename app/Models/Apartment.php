<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Apartment extends Model
{
    use HasUuids;
    protected $fillable = [
        'building_id', 'floor', 'number', 'rooms', 'area',
        'price', 'status', 'type', 'notes',
    ];

    protected function casts(): array
    {
        return ['area' => 'decimal:2', 'price' => 'decimal:2'];
    }

    public function building(): BelongsTo     { return $this->belongsTo(Building::class); }
    public function residents(): HasMany      { return $this->hasMany(Resident::class); }
    public function clients(): HasMany        { return $this->hasMany(Client::class); }
    public function utilityMeters(): HasMany  { return $this->hasMany(UtilityMeter::class); }
    public function maintenanceRequests(): HasMany { return $this->hasMany(MaintenanceRequest::class); }
    public function pmInvoices(): HasMany     { return $this->hasMany(PMInvoice::class); }
}
