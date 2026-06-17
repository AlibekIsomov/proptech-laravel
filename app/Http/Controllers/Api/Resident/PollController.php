<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Poll;
use App\Models\PollVote;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $request->attributes->get('resident');

        $polls = Poll::withoutGlobalScopes()
            ->where('building_id', $resident->apartment?->building_id)
            ->with('votes')
            ->latest()
            ->get()
            ->map(fn($p) => $this->pollData($p, $resident));

        return response()->json(['data' => $polls]);
    }

    public function vote(Request $request, string $id): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $request->attributes->get('resident');

        $poll = Poll::withoutGlobalScopes()
            ->where('id', $id)
            ->where('status', 'active')
            ->firstOrFail();

        $data = $request->validate([
            'option_index' => ['required', 'integer', 'min:0'],
        ]);

        if ($data['option_index'] >= count($poll->options)) {
            return response()->json(['message' => 'Noto\'g\'ri variant'], 422);
        }

        // Avvalgi ovozni o'chirish (bir marta ovoz berish)
        PollVote::where('poll_id', $poll->id)
            ->where('resident_id', $resident->id)
            ->delete();

        PollVote::create([
            'poll_id'      => $poll->id,
            'resident_id'  => $resident->id,
            'option_index' => $data['option_index'],
            'company_id'   => $resident->company_id,
        ]);

        $poll->refresh()->load('votes');

        return response()->json(['data' => $this->pollData($poll, $resident)]);
    }

    private function pollData(Poll $poll, Resident $resident): array
    {
        $optionCount = count($poll->options ?? []);
        $voteCounts  = array_fill(0, $optionCount, 0);

        foreach ($poll->votes as $vote) {
            if (isset($voteCounts[$vote->option_index])) {
                $voteCounts[$vote->option_index]++;
            }
        }

        $myVote = $poll->votes
            ->firstWhere('resident_id', $resident->id);

        return [
            'id'              => $poll->id,
            'title'           => $poll->title,
            'description'     => $poll->description,
            'options'         => $poll->options,
            'status'          => $poll->status,
            'closes_at'       => $poll->closes_at?->toISOString(),
            'vote_counts'     => array_values($voteCounts),
            'user_vote_index' => $myVote?->option_index,
        ];
    }
}
