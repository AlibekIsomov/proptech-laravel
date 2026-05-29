<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function index(): Response
    {
        $companies = Company::withCount('users', 'projects')
            ->latest()
            ->get()
            ->map(fn ($c) => [
                'id'           => $c->id,
                'name'         => $c->name,
                'slug'         => $c->slug,
                'is_active'    => $c->is_active,
                'users_count'  => $c->users_count,
                'projects_count' => $c->projects_count,
                'created_at'   => $c->created_at->format('Y-m-d'),
            ]);

        return Inertia::render('Companies/Index', compact('companies'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'slug'      => ['nullable', 'string', 'max:100', 'unique:companies,slug'],
            'is_active' => ['required', 'boolean'],
        ]);

        if (!$data['slug']) {
            $data['slug'] = \Str::slug($data['name']);
        }

        Company::create($data);

        return back()->with('success', 'Kompaniya yaratildi.');
    }

    public function update(Request $request, Company $company): RedirectResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ]);

        $company->update($data);

        return back()->with('success', 'Kompaniya yangilandi.');
    }

    public function destroy(Company $company): RedirectResponse
    {
        $company->update(['is_active' => false]);
        return back()->with('success', 'Kompaniya o\'chirildi.');
    }
}
