<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function showPmLogin(): Response
    {
        return Inertia::render('Auth/Login', [
            'portal' => 'pm',
        ]);
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        // Foydalanuvchi yaratilmagan bo'lsa kirish taqiqlanadi (self sign-up yo'q)
        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors([
                'email' => 'Email yoki parol noto\'g\'ri, yoki hisobingiz mavjud emas.',
            ])->onlyInput('email');
        }

        $request->session()->regenerate();

        $user   = Auth::user();
        $pmRole = $user->pm_role;

        // PM-specific rollar — har doim o'z portallariga
        if ($pmRole === 'resident')         return redirect()->route('resident.dashboard');
        if ($pmRole === 'dispatcher')       return redirect()->route('dispatcher.dashboard');
        if ($pmRole === 'vendor')           return redirect()->route('vendor.dashboard');
        if ($pmRole === 'property_manager') return redirect()->route('pm.dashboard');

        // Savdo portali o'chirilgan — qolgan barcha rollar PM dashboardga
        return redirect()->route('pm.dashboard');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('pm.login');
    }
}
