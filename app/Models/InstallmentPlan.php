<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InstallmentPlan extends Model
{
    use HasUuids;

    protected $fillable = [
        'client_id', 'apartment_id', 'total_amount', 'down_payment',
        'duration_months', 'monthly_payment_amount', 'start_date', 'status',
    ];

    protected function casts(): array
    {
        return [
            'total_amount'           => 'decimal:2',
            'down_payment'           => 'decimal:2',
            'monthly_payment_amount' => 'decimal:2',
            'start_date'             => 'date',
        ];
    }

    public function client(): BelongsTo   { return $this->belongsTo(Client::class); }
    public function apartment(): BelongsTo { return $this->belongsTo(Apartment::class); }
    public function payments(): HasMany   { return $this->hasMany(InstallmentPayment::class); }
}
