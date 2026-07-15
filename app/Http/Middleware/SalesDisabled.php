<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SalesDisabled
{
    public function handle(Request $request, Closure $next): Response
    {
        // Savdo (Sales CRM) portali o'chirilgan — faqat PM ishlaydi
        abort(404);
    }
}
