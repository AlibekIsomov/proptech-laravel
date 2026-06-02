<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstallmentPayment extends Model
{
    use HasUuids;

    protected $fillable = [
        'installment_plan_id', 'due_date', 'amount', 'status', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'   => 'decimal:2',
            'due_date' => 'date',
            'paid_at'  => 'date',
        ];
    }

    public function plan(): BelongsTo { return $this->belongsTo(InstallmentPlan::class, 'installment_plan_id'); }
}
