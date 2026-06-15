<?php

namespace App\Http\Controllers\Telegram\WebApp;

use App\Models\TelegramSession;
use Illuminate\Http\Request;

trait ResolvesTelegramSession
{
    protected function session(Request $request): TelegramSession
    {
        return $request->attributes->get('telegramSession');
    }
}
