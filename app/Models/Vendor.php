<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use App\Traits\SyncsToSupabase;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[ScopedBy([CompanyScope::class])]
class Vendor extends Model
{
    use HasUuids;
    use SyncsToSupabase;

    protected $fillable = [
        'company_id', 'user_id', 'name', 'phone', 'email',
        'telegram_username', 'telegram_chat_id', 'specializations', 'rating',
        'total_jobs', 'completed_jobs', 'is_active', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'specializations' => 'array',
            'rating' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function maintenanceRequests(): HasMany
    {
        return $this->hasMany(MaintenanceRequest::class, 'assigned_vendor_id');
    }

    /**
     * Takror ulushini hisoblashda maxrajga qo'shiladigan vazn.
     *
     * Busiz bitta ish qilib bitta takror olgan yangi usta darrov to'liq jarima
     * oladi va boshqa hech qachon tanlanmaydi — bir marta omadsizlik uchun umrbod
     * qora ro'yxat. Bu qo'shimcha kam ishli ustaning jarimasini yumshatadi, ish
     * soni ortgani sari ta'siri yo'qoladi.
     */
    private const REPEAT_PRIOR_JOBS = 5;

    /**
     * Reyting va ish hisoblagichlarini tarixdan qayta hisoblaydi.
     *
     * rating = avg(resident_rating) - 2 × takrorlar / (yakunlangan ishlar + 5)
     * Takror = shu usta yakunlagan ta'mirdan keyin o'sha kvartira/kategoriyada
     * qayta ochilgan ariza (maintenance_requests.repeat_of_id orqali).
     * Formula o'z-o'zini tuzatadi: yangi muvaffaqiyatli ishlar reytingni qaytaradi.
     */
    public function recalculateRating(): void
    {
        $stats = MaintenanceRequest::withoutGlobalScopes()
            ->where('assigned_vendor_id', $this->id)
            ->selectRaw("count(*) as total, count(*) filter (where status = 'completed') as completed, avg(resident_rating) as avg_rating")
            ->first();

        $repeats = MaintenanceRequest::withoutGlobalScopes()
            ->join('maintenance_requests as originals', 'maintenance_requests.repeat_of_id', '=', 'originals.id')
            ->where('originals.assigned_vendor_id', $this->id)
            ->count();

        $repeatShare = $repeats / ($stats->completed + self::REPEAT_PRIOR_JOBS);

        $this->updateQuietly([
            'total_jobs' => $stats->total,
            'completed_jobs' => $stats->completed,
            // Hali baholanmagan usta: 0 (default) qoladi; baholangani 1 dan pastga tushmaydi
            'rating' => $stats->avg_rating === null ? 0 : round(max(1, $stats->avg_rating - 2 * $repeatShare), 2),
        ]);
    }
}
