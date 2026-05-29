<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PollVote extends Model
{
    use HasUuids;
    protected $fillable = ['poll_id', 'resident_id', 'apartment_id', 'option_id'];

    public function poll(): BelongsTo      { return $this->belongsTo(Poll::class); }
    public function resident(): BelongsTo  { return $this->belongsTo(Resident::class); }
    public function apartment(): BelongsTo { return $this->belongsTo(Apartment::class); }
}
