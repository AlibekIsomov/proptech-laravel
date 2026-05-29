<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndSuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // ── Rollarni yaratish ──────────────────────────────────────────────────
        $roles = [
            'super_admin',
            'company_admin',
            'manager',
            'viewer',
            'property_manager',
            'dispatcher',
            'vendor',
            'resident',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->command->info('✓ Rollar yaratildi');

        // ── Super Admin kompaniyasi ────────────────────────────────────────────
        $company = Company::firstOrCreate(
            ['slug' => 'proptech-uz'],
            ['name' => 'PropTech UZ HQ', 'is_active' => true]
        );

        // ── Super Admin foydalanuvchi ──────────────────────────────────────────
        $admin = User::firstOrCreate(
            ['email' => 'admin@proptech.uz'],
            [
                'full_name'  => 'Super Admin',
                'password'   => Hash::make('password'),
                'company_id' => $company->id,
            ]
        );

        $admin->assignRole('super_admin');
        $this->command->info('✓ Super Admin yaratildi: admin@proptech.uz / password');

        // ── Test kompaniyasi va company_admin ─────────────────────────────────
        $testCompany = Company::firstOrCreate(
            ['slug' => 'demo-company'],
            ['name' => 'Demo Company', 'is_active' => true]
        );

        $companyAdmin = User::firstOrCreate(
            ['email' => 'demo@proptech.uz'],
            [
                'full_name'  => 'Demo Admin',
                'password'   => Hash::make('password'),
                'company_id' => $testCompany->id,
            ]
        );

        $companyAdmin->assignRole('company_admin');
        $this->command->info('✓ Company Admin yaratildi: demo@proptech.uz / password');
    }
}
