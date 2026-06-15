<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramSession extends Model
{
    use HasUuids;

    protected $fillable = [
        'chat_id', 'telegram_user_id', 'telegram_username', 'first_name', 'last_name',
        'resident_ids', 'active_resident_id', 'vendor_id', 'active_role',
        'state', 'context',
    ];

    protected function casts(): array
    {
        return [
            'resident_ids' => 'array',
            'context'      => 'array',
        ];
    }

    public function activeResident(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'active_resident_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /** Ushbu chatga bog'langan barcha rezidentlar (bir nechta kvartiraga ega bo'lsa). */
    public function residents(): Collection
    {
        $ids = $this->resident_ids ?? [];

        if (empty($ids)) {
            return new Collection();
        }

        return Resident::whereIn('id', $ids)->get();
    }

    public function isLinked(): bool
    {
        return $this->active_resident_id !== null || $this->vendor_id !== null;
    }

    public function isResident(): bool
    {
        return $this->active_role === 'resident' && $this->active_resident_id !== null;
    }

    public function isVendor(): bool
    {
        return $this->active_role === 'vendor' && $this->vendor_id !== null;
    }
}
