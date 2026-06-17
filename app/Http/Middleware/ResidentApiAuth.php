<?php

namespace App\Http\Middleware;

use App\Models\Resident;
use Closure;
use Illuminate\Http\Request;

class ResidentApiAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json(['message' => 'Token topilmadi'], 401);
        }

        $resident = Resident::withoutGlobalScopes()
            ->where('api_token', $token)
            ->where('is_active', true)
            ->first();

        if (! $resident) {
            return response()->json(['message' => 'Token yaroqsiz'], 401);
        }

        $request->attributes->set('resident', $resident);

        return $next($request);
    }
}
