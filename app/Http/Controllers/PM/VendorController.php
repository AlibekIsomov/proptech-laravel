<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VendorController extends Controller
{
    public function index(): Response
    {
        $vendors = Vendor::latest()->get()->map(fn ($v) => [
            'id'             => $v->id,
            'name'           => $v->name,
            'phone'          => $v->phone,
            'email'          => $v->email,
            'telegram_username' => $v->telegram_username,
            'specializations'   => $v->specializations,
            'rating'            => $v->rating,
            'total_jobs'        => $v->total_jobs,
            'completed_jobs'    => $v->completed_jobs,
            'is_active'         => $v->is_active,
            'notes'             => $v->notes,
        ]);

        return Inertia::render('PM/Vendors/Index', compact('vendors'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'phone'            => ['required', 'string', 'max:30'],
            'email'            => ['nullable', 'email'],
            'telegram_username'=> ['nullable', 'string', 'max:100'],
            'specializations'  => ['nullable', 'array'],
            'specializations.*'=> ['string'],
            'notes'            => ['nullable', 'string'],
        ]);

        $data['company_id']     = auth()->user()->company_id;
        $data['specializations']= $data['specializations'] ?? [];

        Vendor::create($data);

        return back()->with('success', 'Vendor qo\'shildi.');
    }

    public function update(Request $request, Vendor $vendor): RedirectResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'phone'            => ['required', 'string', 'max:30'],
            'email'            => ['nullable', 'email'],
            'telegram_username'=> ['nullable', 'string', 'max:100'],
            'specializations'  => ['nullable', 'array'],
            'is_active'        => ['required', 'boolean'],
            'notes'            => ['nullable', 'string'],
        ]);

        $vendor->update($data);

        return back()->with('success', 'Vendor yangilandi.');
    }

    public function destroy(Vendor $vendor): RedirectResponse
    {
        $vendor->delete();
        return back()->with('success', 'Vendor o\'chirildi.');
    }
}


