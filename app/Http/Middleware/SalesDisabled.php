<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SalesDisabled
{
    public function handle(Request $request, Closure $next): Response
    {
        return redirect()->route('pm.dashboard');
    }
}
