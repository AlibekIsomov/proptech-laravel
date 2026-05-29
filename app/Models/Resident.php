<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[ScopedBy([CompanyScope::class])]
class Resident extends Model
{
    use HasUuids;
    protected $fillable = [
        'apartment_id', 'company_id', 'user_id', 'full_name',
        'phone', 'email', 'telegram_username', 'telegram_chat_id',
        'resident_type', 'move_in_date', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'move_in_date' => 'date'];
    }

    public function apartment(): BelongsTo        { return $this->belongsTo(Apartment::class); }
    public function company(): BelongsTo          { return $this->belongsTo(Company::class); }
    public function user(): BelongsTo             { return $this->belongsTo(User::class); }
    public function pollVotes(): HasMany          { return $this->hasMany(PollVote::class); }
    public function maintenanceRequests(): HasMany { return $this->hasMany(MaintenanceRequest::class); }
    public function pmInvoices(): HasMany         { return $this->hasMany(PMInvoice::class); }
}
