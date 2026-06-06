<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Services\TelegramAlert;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'sales.disabled' => \App\Http\Middleware\SalesDisabled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {

        // Production da har qanday xatolikni Telegram ga yuborish
        $exceptions->report(function (Throwable $e) {
            // Faqat production muhitda ishlaydi
            if (! app()->isProduction()) {
                return false; // default log handler ishlaydi
            }

            // Ushbu xatoliklar oddiy — Telegram ga yubormaymiz
            $ignored = [
                \Illuminate\Auth\AuthenticationException::class,
                \Illuminate\Auth\Access\AuthorizationException::class,
                \Illuminate\Validation\ValidationException::class,
                \Illuminate\Database\Eloquent\ModelNotFoundException::class,
                \Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class,
                \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException::class,
                \Illuminate\Session\TokenMismatchException::class,
            ];

            foreach ($ignored as $ignoredClass) {
                if ($e instanceof $ignoredClass) {
                    return false;
                }
            }

            // Xato xabarini tayyorlash
            $type    = class_basename($e);
            $message = substr($e->getMessage(), 0, 300);
            $file    = str_replace(base_path(), '', $e->getFile());
            $line    = $e->getLine();

            TelegramAlert::error(
                "🔥 {$type}",
                "💬 {$message}\n📁 {$file}:{$line}"
            );

            return false; // Laravel o'zining standart log ni ham yozsin
        });

    })->create();
