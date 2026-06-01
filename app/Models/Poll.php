<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Poll extends Model
{
    use \App\Traits\SyncsToSupabase;

    use HasUuids;
    protected $fillable = [
        'building_id', 'created_by', 'title', 'description',
        'options', 'status', 'quorum_pct', 'closes_at', 'ai_summary',
    ];

    protected function casts(): array
    {
        return [
            'options'   => 'array',
            'closes_at' => 'datetime',
        ];
    }

    public function building(): BelongsTo  { return $this->belongsTo(Building::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function votes(): HasMany       { return $this->hasMany(PollVote::class); }
}
