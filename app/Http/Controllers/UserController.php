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
    private const SALES_ROLES = ['super_admin', 'company_admin', 'manager', 'viewer'];
    private const PM_ROLES    = ['property_manager', 'dispatcher', 'vendor', 'resident'];

    public function index(): Response
    {
        $query = User::with(['roles', 'company']);

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

        $salesRolesQuery = Role::whereIn('name', self::SALES_ROLES);
        if (!auth()->user()->hasRole('super_admin')) {
            $salesRolesQuery->where('name', '!=', 'super_admin');
        }
        $salesRoles = $salesRolesQuery->get(['id', 'name']);

        $companies = auth()->user()->hasRole('super_admin')
            ? Company::where('is_active', true)->get(['id', 'name'])
            : Company::where('id', auth()->user()->company_id)->get(['id', 'name']);

        return Inertia::render('Users/Index', [
            'users'      => $users,
            'salesRoles' => $salesRoles,
            'pmRoles'    => self::PM_ROLES,
            'companies'  => $companies,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $rules = [
            'full_name'  => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'password'   => ['required', 'string', 'min:8'],
            'role'       => ['nullable', 'exists:roles,name', 'in:' . implode(',', self::SALES_ROLES)],
            'pm_role'    => ['nullable', 'in:' . implode(',', self::PM_ROLES)],
        ];

        if (auth()->user()->hasRole('super_admin')) {
            $rules['company_id'] = ['required', 'exists:companies,id'];
        }

        $data = $request->validate($rules);

        if (empty($data['role']) && empty($data['pm_role'])) {
            return back()->withErrors(['role' => 'Kamida bitta rol tanlang.']);
        }

        if (!auth()->user()->hasRole('super_admin') && ($data['role'] ?? '') === 'super_admin') {
            abort(403, 'Unauthorized role assignment');
        }

        $companyId = auth()->user()->hasRole('super_admin')
            ? $data['company_id']
            : auth()->user()->company_id;

        $user = User::create([
            'full_name'  => $data['full_name'],
            'email'      => $data['email'],
            'password'   => Hash::make($data['password']),
            'company_id' => $companyId,
            'pm_role'    => $data['pm_role'] ?? null,
        ]);

        if (!empty($data['role'])) {
            $user->assignRole($data['role']);
        }

        return back()->with('success', 'Foydalanuvchi yaratildi.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        // Security check: non-super_admin can only manage users within their own company
        if (!auth()->user()->hasRole('super_admin') && $user->company_id !== auth()->user()->company_id) {
            abort(403, 'Unauthorized');
        }

        $rules = [
            'full_name'  => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'unique:users,email,' . $user->id],
            'role'       => ['nullable', 'exists:roles,name', 'in:' . implode(',', self::SALES_ROLES)],
            'pm_role'    => ['nullable', 'in:' . implode(',', self::PM_ROLES)],
            'password'   => ['nullable', 'string', 'min:8'],
        ];

        if (auth()->user()->hasRole('super_admin')) {
            $rules['company_id'] = ['required', 'exists:companies,id'];
        }

        $data = $request->validate($rules);

        if (empty($data['role']) && empty($data['pm_role'])) {
            return back()->withErrors(['role' => 'Kamida bitta rol tanlang.']);
        }

        if (!auth()->user()->hasRole('super_admin') && ($data['role'] ?? '') === 'super_admin') {
            abort(403, 'Unauthorized role assignment');
        }

        $updateData = [
            'full_name' => $data['full_name'],
            'email'     => $data['email'],
            'pm_role'   => $data['pm_role'] ?? null,
        ];

        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        if (auth()->user()->hasRole('super_admin')) {
            $updateData['company_id'] = $data['company_id'];
        }

        $user->update($updateData);
        $user->syncRoles(!empty($data['role']) ? [$data['role']] : []);

        return back()->with('success', 'Foydalanuvchi yangilandi.');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'O\'z hisobingizni o\'chira olmaysiz.']);
        }

        // Security check: non-super_admin can only manage users within their own company
        if (!auth()->user()->hasRole('super_admin') && $user->company_id !== auth()->user()->company_id) {
            abort(403, 'Unauthorized');
        }

        // Security check: non-super_admin cannot delete super_admin users
        if ($user->hasRole('super_admin') && !auth()->user()->hasRole('super_admin')) {
            abort(403, 'Unauthorized');
        }

        $user->delete();
        return back()->with('success', 'Foydalanuvchi o\'chirildi.');
    }
}
