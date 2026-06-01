<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenancePhoto extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = ['request_id', 'photo_url', 'photo_type', 'uploaded_by'];

    public function request(): BelongsTo    { return $this->belongsTo(MaintenanceRequest::class, 'request_id'); }
    public function uploadedBy(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}
