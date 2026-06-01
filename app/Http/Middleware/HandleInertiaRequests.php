<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * Inertia uchun asosiy Blade template.
     */
    protected $rootView = 'app';

    /**
     * Har bir sahifaga yuboriluvchi umumiy ma'lumotlar (shared props).
     * React komponentlarida usePage().props orqali olinadi.
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id'           => $request->user()->id,
                    'full_name'    => $request->user()->full_name,
                    'email'        => $request->user()->email,
                    'role'         => $request->user()->getPrimaryRoleAttribute(),
                    'pm_role'      => $request->user()->pm_role,
                    'company_id'   => $request->user()->company_id,
                    'company_name' => $request->user()->company?->name,
                ] : null,
            ],
            'brand' => [
                'name'       => config('app.brand_name', '1Mahalla'),
                'tagline'    => config('app.brand_tagline', 'Mahalla · Texnologiya'),
                'legalName'  => config('app.brand_legal_name', '1Mahalla'),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ]);
    }
}
