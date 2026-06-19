<!DOCTYPE html>
<html lang="uz">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="1Mahalla — O'zbekiston uchun aqlli uy-joy va sotuvlarni boshqarish platformasi" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        @inertiaHead
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/css/pm.css', 'resources/js/app.tsx'])
    </head>
    <body>
        @inertia
    </body>
</html>
