<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use \App\Traits\SyncsToSupabase;

    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'full_name',
        'email',
        'password',
        'company_id',
        'pm_role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Display name — full_name yoki email boshi */
    public function getDisplayNameAttribute(): string
    {
        return $this->full_name ?? explode('@', $this->email)[0];
    }

    /** Foydalanuvchining asosiy roli (Spatie) */
    public function getPrimaryRoleAttribute(): string
    {
        return $this->getRoleNames()->first() ?? 'viewer';
    }
}
