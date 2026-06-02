<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ScopedBy([CompanyScope::class])]
class Client extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'company_id', 'assigned_to', 'full_name', 'phone', 'email',
        'status', 'budget_usd', 'source', 'notes', 'apartment_id',
    ];

    protected function casts(): array
    {
        return ['budget_usd' => 'decimal:2'];
    }

    public function company(): BelongsTo    { return $this->belongsTo(Company::class); }
    public function assignedTo(): BelongsTo { return $this->belongsTo(User::class, 'assigned_to'); }
    public function apartment(): BelongsTo  { return $this->belongsTo(Apartment::class); }
    public function installmentPlans(): \Illuminate\Database\Eloquent\Relations\HasMany { return $this->hasMany(InstallmentPlan::class); }
}
