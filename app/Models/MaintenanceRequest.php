<?php

namespace App\Models;

use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\Scopes\CompanyScope;

use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[ScopedBy([CompanyScope::class])]

class MaintenanceRequest extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'apartment_id', 'building_id', 'company_id', 'resident_id',
        'category', 'priority', 'status', 'title', 'description',
        'ai_category_suggested', 'ai_priority_suggested', 'ai_summary',
        'assigned_vendor_id', 'assigned_dispatcher_id', 'sla_deadline',
        'resolution_notes', 'cost_amount', 'resident_rating', 'resident_feedback',
        'assigned_at', 'started_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'cost_amount'   => 'decimal:2',
            'assigned_at'   => 'datetime',
            'started_at'    => 'datetime',
            'completed_at'  => 'datetime',
            'sla_deadline'  => 'datetime',
        ];
    }

    public function apartment(): BelongsTo      { return $this->belongsTo(Apartment::class); }
    public function building(): BelongsTo       { return $this->belongsTo(Building::class); }
    public function resident(): BelongsTo       { return $this->belongsTo(Resident::class); }
    public function assignedVendor(): BelongsTo { return $this->belongsTo(Vendor::class, 'assigned_vendor_id'); }
    public function dispatcher(): BelongsTo     { return $this->belongsTo(User::class, 'assigned_dispatcher_id'); }
    public function photos(): HasMany           { return $this->hasMany(MaintenancePhoto::class, 'request_id'); }
}

