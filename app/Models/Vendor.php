<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[ScopedBy([CompanyScope::class])]
class Vendor extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'company_id', 'user_id', 'name', 'phone', 'email',
        'telegram_username', 'specializations', 'rating',
        'total_jobs', 'completed_jobs', 'is_active', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'specializations' => 'array',
            'rating'          => 'decimal:2',
            'is_active'       => 'boolean',
        ];
    }

    public function company(): BelongsTo          { return $this->belongsTo(Company::class); }
    public function user(): BelongsTo             { return $this->belongsTo(User::class); }
    public function maintenanceRequests(): HasMany { return $this->hasMany(MaintenanceRequest::class, 'assigned_vendor_id'); }
}
