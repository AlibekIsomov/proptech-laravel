<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\Models\Role;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Seed all roles so every test can assign them without a seeder step.
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

        // Flush Spatie's in-memory permission cache so parallel workers
        // don't see stale data from previous tests.
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
