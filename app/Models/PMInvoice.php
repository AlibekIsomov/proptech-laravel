<?php

namespace App\Models;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ScopedBy([CompanyScope::class])]
class PMInvoice extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $table = 'pm_invoices';

    protected $fillable = [
        'apartment_id', 'resident_id', 'company_id', 'invoice_number',
        'billing_period_start', 'billing_period_end', 'pm_fee',
        'utilities_amount', 'maintenance_amount', 'total_amount',
        'currency', 'status', 'pdf_url', 'due_date', 'sent_at', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'billing_period_start' => 'date',
            'billing_period_end'   => 'date',
            'due_date'             => 'date',
            'sent_at'              => 'datetime',
            'paid_at'              => 'datetime',
            'pm_fee'               => 'decimal:2',
            'utilities_amount'     => 'decimal:2',
            'maintenance_amount'   => 'decimal:2',
            'total_amount'         => 'decimal:2',
        ];
    }

    public function apartment(): BelongsTo { return $this->belongsTo(Apartment::class); }
    public function resident(): BelongsTo  { return $this->belongsTo(Resident::class); }
    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
}
