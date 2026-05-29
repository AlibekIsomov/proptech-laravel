<?php

namespace App\Http\Controllers;

use App\Models\Apartment;
use App\Models\Client;
use App\Models\User;
use App\Services\ClaudeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Client::with(['assignedTo', 'apartment.building.project'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->search, fn ($q, $s) =>
                $q->where(fn ($q2) =>
                    $q2->where('full_name', 'like', "%{$s}%")
                       ->orWhere('phone', 'like', "%{$s}%")
                       ->orWhere('email', 'like', "%{$s}%")
                )
            );

        // Manager faqat o'z mijozlarini ko'radi
        if (auth()->user()->hasRole('manager')) {
            $query->where('assigned_to', auth()->id());
        }

        $clients = $query->latest()->get()->map(fn ($c) => [
            'id'          => $c->id,
            'full_name'   => $c->full_name,
            'phone'       => $c->phone,
            'email'       => $c->email,
            'status'      => $c->status,
            'budget_usd'  => $c->budget_usd,
            'source'      => $c->source,
            'notes'       => $c->notes,
            'assigned_to' => $c->assigned_to,
            'assignee'    => $c->assignedTo?->full_name,
            'apartment'   => $c->apartment ? [
                'id'      => $c->apartment->id,
                'number'  => $c->apartment->number,
                'project' => $c->apartment->building?->project?->name,
            ] : null,
            'created_at'  => $c->created_at->format('Y-m-d'),
        ]);

        $managers   = User::role(['manager', 'company_admin', 'super_admin'])->get(['id', 'full_name']);
        $apartments = Apartment::where('status', 'available')->with('building.project')->get()
            ->map(fn ($a) => [
                'id'     => $a->id,
                'label'  => "№{$a->number} — {$a->building?->project?->name}",
            ]);

        return Inertia::render('Clients/Index', compact('clients', 'managers', 'apartments'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'full_name'    => ['required', 'string', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:30'],
            'email'        => ['nullable', 'email', 'max:255'],
            'status'       => ['required', 'in:new,contacted,viewing,reserved,bought'],
            'budget_usd'   => ['nullable', 'numeric', 'min:0'],
            'source'       => ['nullable', 'string', 'max:100'],
            'notes'        => ['nullable', 'string'],
            'assigned_to'  => ['nullable', 'exists:users,id'],
            'apartment_id' => ['nullable', 'exists:apartments,id'],
        ]);

        $data['company_id'] = auth()->user()->company_id;
        if (!isset($data['assigned_to'])) {
            $data['assigned_to'] = auth()->id();
        }

        Client::create($data);

        return back()->with('success', 'Mijoz qo\'shildi.');
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $data = $request->validate([
            'full_name'    => ['required', 'string', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:30'],
            'email'        => ['nullable', 'email', 'max:255'],
            'status'       => ['required', 'in:new,contacted,viewing,reserved,bought'],
            'budget_usd'   => ['nullable', 'numeric', 'min:0'],
            'source'       => ['nullable', 'string', 'max:100'],
            'notes'        => ['nullable', 'string'],
            'assigned_to'  => ['nullable', 'exists:users,id'],
            'apartment_id' => ['nullable', 'exists:apartments,id'],
        ]);

        // Agar status "reserved" yoki "bought" bo'lsa, kvartira statusini ham o'zgartirish
        if (in_array($data['status'], ['reserved', 'bought']) && isset($data['apartment_id'])) {
            $newAptStatus = $data['status'] === 'bought' ? 'sold' : 'reserved';
            Apartment::where('id', $data['apartment_id'])->update(['status' => $newAptStatus]);
        }

        $client->update($data);

        return back()->with('success', 'Mijoz yangilandi.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();
        return back()->with('success', 'Mijoz o\'chirildi.');
    }

    /**
     * POST /api/ai-email
     * AI yordamida email matn generatsiyasi
     */
    public function generateEmail(Request $request, ClaudeService $claude): JsonResponse
    {
        $data = $request->validate([
            'client_name'    => ['required', 'string'],
            'apartment_info' => ['required', 'string'],
            'context'        => ['nullable', 'string'],
        ]);

        $email = $claude->generateEmail(
            $data['client_name'],
            $data['apartment_info'],
            $data['context'] ?? ''
        );

        return response()->json(['email' => $email]);
    }
}
