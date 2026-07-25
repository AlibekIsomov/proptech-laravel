<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Mahalla Fix — fuqarolarning shahar/mahalla infratuzilma muammolari haqidagi murojaatlari.
 *
 * Diqqat: bu model App\Models\MaintenanceRequest'dan (aholi + kvartira nosozligi) ALOHIDA.
 * Murojaat GPS koordinatasiga bog'lanadi, kvartiraga emas. CompanyScope QO'LLANMAYDI —
 * murojaatni Telegram sessiyasi (auth() yo'q kontekst) yaratadi va admin barcha
 * murojaatlarni ko'radi; kompaniya filtri admin controllerda qo'lda qo'llaniladi.
 */
class CityReport extends Model
{
    use HasUuids;

    protected $fillable = [
        'ticket_code', 'company_id',
        'reporter_telegram_id', 'reporter_name', 'reporter_username',
        'latitude', 'longitude', 'address',
        'category', 'priority', 'title', 'description',
        'ai_category', 'ai_priority', 'ai_summary',
        'photo_path', 'status', 'resolution_notes', 'handled_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'    => 'decimal:7',
            'longitude'   => 'decimal:7',
            'resolved_at' => 'datetime',
        ];
    }

    public const CATEGORY_LABELS = [
        'pothole'      => "🕳 Yo'l teshigi",
        'street_light' => "💡 Ko'cha chirog'i",
        'water_leak'   => '🚰 Suv sizishi',
        'gas_leak'     => '🔥 Gaz sizishi',
        'garbage'      => '🗑 Chiqindi',
        'other'        => '📦 Boshqa',
    ];

    public const PRIORITY_LABELS = [
        'low'       => '🟢 Past',
        'medium'    => "🟡 O'rta",
        'high'      => '🟠 Yuqori',
        'emergency' => '🔴 Favqulodda',
    ];

    public const STATUS_LABELS = [
        'submitted'   => 'Yuborildi',
        'in_progress' => 'Jarayonda',
        'resolved'    => 'Hal etildi',
        'rejected'    => 'Rad etildi',
    ];

    public static function categoryLabel(?string $key): string
    {
        return self::CATEGORY_LABELS[$key] ?? self::CATEGORY_LABELS['other'];
    }

    public static function priorityLabel(?string $key): string
    {
        return self::PRIORITY_LABELS[$key] ?? self::PRIORITY_LABELS['medium'];
    }

    public static function statusLabel(?string $key): string
    {
        return self::STATUS_LABELS[$key] ?? $key ?? '';
    }

    protected static function booted(): void
    {
        static::creating(function (CityReport $report) {
            if (empty($report->ticket_code)) {
                $report->ticket_code = self::generateTicketCode();
            }
        });
    }

    /** Unikal ticket kodi: MF-2026-000123 */
    public static function generateTicketCode(): string
    {
        do {
            $code = 'MF-'.now()->year.'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('ticket_code', $code)->exists());

        return $code;
    }

    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
