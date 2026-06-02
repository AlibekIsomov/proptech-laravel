<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Poll;
use App\Models\PM\Apartment;
use App\Models\PM\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PollController extends Controller
{
    /**
     * Display a listing of the resource or fetch JSON data for a building.
     */
    public function index(Request $request)
    {
        if (($request->wantsJson() || $request->ajax()) && !$request->header('X-Inertia')) {
            $buildingId = $request->query('pm_building_id');
            if (!$buildingId) {
                return response()->json(['polls' => [], 'apartment_count' => 0]);
            }

            $apartmentCount = Apartment::where('pm_building_id', $buildingId)->count();

            $polls = Poll::where('building_id', $buildingId)
                ->with('votes')
                ->latest()
                ->get()
                ->map(function ($poll) {
                    $votes = $poll->votes;
                    $totalVotes = $votes->count();

                    $voteCounts = [];
                    foreach ($poll->options as $opt) {
                        $voteCounts[$opt['id']] = 0;
                    }
                    foreach ($votes as $vote) {
                        if (isset($voteCounts[$vote->option_id])) {
                            $voteCounts[$vote->option_id]++;
                        } else {
                            $voteCounts[$vote->option_id] = 1;
                        }
                    }

                    return [
                        'id' => $poll->id,
                        'pm_building_id' => $poll->building_id,
                        'title' => $poll->title,
                        'description' => $poll->description,
                        'options' => $poll->options,
                        'status' => $poll->status,
                        'quorum_pct' => $poll->quorum_pct,
                        'closes_at' => $poll->closes_at ? $poll->closes_at->toIso8601String() : null,
                        'ai_summary' => $poll->ai_summary,
                        'vote_counts' => $voteCounts,
                        'total_votes' => $totalVotes,
                        'created_at' => $poll->created_at->toIso8601String(),
                    ];
                });

            return response()->json([
                'polls' => $polls,
                'apartment_count' => $apartmentCount,
            ]);
        }

        $projects = Project::with(['buildings' => function($q) {
            $q->orderBy('name');
        }])->orderBy('name')->get()->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'buildings' => $p->buildings->map(fn($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'pm_project_id' => $b->pm_project_id,
            ]),
        ]);

        return Inertia::render('PM/Polls/Index', [
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'pm_building_id' => 'required|exists:pm_buildings,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'options' => 'required|array|min:2',
            'options.*.id' => 'required|string',
            'options.*.label' => 'required|string',
            'quorum_pct' => 'required|integer|min:0|max:100',
            'closes_at' => 'nullable|date',
        ]);

        $data['building_id'] = $data['pm_building_id'];
        unset($data['pm_building_id']);
        $data['created_by'] = auth()->id();
        $data['status'] = 'open';

        $poll = Poll::create($data);

        return response()->json(['success' => true, 'poll' => $poll]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $poll = Poll::findOrFail($id);

        $data = $request->validate([
            'status' => 'required|in:open,closed,cancelled',
        ]);

        $poll->update($data);

        return response()->json(['success' => true]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $poll = Poll::findOrFail($id);
        $poll->delete();

        return response()->json(['success' => true]);
    }
}


