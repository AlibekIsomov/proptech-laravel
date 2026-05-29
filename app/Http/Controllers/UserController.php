<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(): Response
    {
        $query = User::with(['roles', 'company']);

        // company_admin faqat o'z kompaniyasini ko'radi
        if (!auth()->user()->hasRole('super_admin')) {
            $query->where('company_id', auth()->user()->company_id);
        }

        $users = $query->get()->map(fn ($u) => [
            'id'           => $u->id,
            'full_name'    => $u->full_name,
            'email'        => $u->email,
            'role'         => $u->getRoleNames()->first(),
            'pm_role'      => $u->pm_role,
            'company_id'   => $u->company_id,
            'company_name' => $u->company?->name,
            'created_at'   => $u->created_at->format('Y-m-d'),
        ]);

        $roles     = Role::all(['id', 'name']);
        $companies = auth()->user()->hasRole('super_admin')
            ? Company::where('is_active', true)->get(['id', 'name'])
            : Company::where('id', auth()->user()->company_id)->get(['id', 'name']);

        return Inertia::render('Users/Index', compact('users', 'roles', 'companies'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'full_name'  => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'password'   => ['required', 'string', 'min:8'],
            'role'       => ['required', 'exists:roles,name'],
            'pm_role'    => ['nullable', 'in:property_manager,dispatcher,vendor,resident'],
            'company_id' => ['required', 'exists:companies,id'],
        ]);

        // company_admin faqat o'z kompaniyasiga qo'sha oladi
        if (!auth()->user()->hasRole('super_admin')) {
            $data['company_id'] = auth()->user()->company_id;
        }

        $user = User::create([
            'full_name'  => $data['full_name'],
            'email'      => $data['email'],
            'password'   => Hash::make($data['password']),
            'company_id' => $data['company_id'],
            'pm_role'    => $data['pm_role'] ?? null,
        ]);

        $user->assignRole($data['role']);

        return back()->with('success', 'Foydalanuvchi yaratildi.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'full_name'  => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'unique:users,email,' . $user->id],
            'role'       => ['required', 'exists:roles,name'],
            'pm_role'    => ['nullable', 'in:property_manager,dispatcher,vendor,resident'],
            'password'   => ['nullable', 'string', 'min:8'],
        ]);

        $updateData = [
            'full_name' => $data['full_name'],
            'email'     => $data['email'],
            'pm_role'   => $data['pm_role'] ?? null,
        ];

        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        $user->update($updateData);
        $user->syncRoles([$data['role']]);

        return back()->with('success', 'Foydalanuvchi yangilandi.');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'O\'z hisobingizni o\'chira olmaysiz.']);
        }

        $user->delete();
        return back()->with('success', 'Foydalanuvchi o\'chirildi.');
    }
}
