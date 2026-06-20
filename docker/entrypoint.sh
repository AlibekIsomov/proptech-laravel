#!/bin/sh
set -e

echo "🚀 Starting 1Mahalla PHP-FPM..."

# Ensure storage directories exist and are writable
mkdir -p /var/www/html/storage/framework/cache/data
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# public_data volume bo'sh bo'lsa (yangi deploy), image dan public/ fayllarni ko'chiramiz
# Docker named volume image ichidagi fayllarni yashiradi, shu sababli bu qadam kerak.
if [ ! -f /var/www/html/public/index.php ]; then
    echo "📦  Populating public/ volume from image..."
    cp -r /var/www/html/public.bak/. /var/www/html/public/
    chown -R www-data:www-data /var/www/html/public
    echo "✅  public/ volume populated."
fi

# Har deploy da Vite build fayllarini yangilaymiz (JS/CSS o'zgarishlar ko'rinsin)
echo "🔄  Refreshing public/build from new image..."
rm -rf /var/www/html/public/build
cp -r /var/www/html/public.bak/build /var/www/html/public/build
chown -R www-data:www-data /var/www/html/public/build
echo "✅  public/build refreshed."

# public/fonts ham image bilan birga keladi (masalan landing page shriftlari) —
# build/ kabi har deploy da yangilanishi kerak, aks holda eski volume'da qolib ketadi
echo "🔄  Refreshing public/fonts from new image..."
rm -rf /var/www/html/public/fonts
cp -r /var/www/html/public.bak/fonts /var/www/html/public/fonts
chown -R www-data:www-data /var/www/html/public/fonts
echo "✅  public/fonts refreshed."

# Storage symlink — public/storage → storage/app/public
# Bu bo'lmasa fayl yuklash va media xizmat 500 xato beradi
echo "🔗  Creating storage symlink..."
php artisan storage:link --force 2>/dev/null || echo "⚠️  storage:link warning (may already exist)"

# Wait a moment for DB to be ready (if needed)
echo "⏳ Waiting for services..."
sleep 2

# APP_KEY tekshiruv
# Agar docker-compose env_file orqali APP_KEY berilgan bo'lsa — hech narsa qilmaymiz.
# Agar umuman yo'q bo'lsa — .env.example dan .env yaratib, key generate qilamiz.
if [ -z "${APP_KEY}" ]; then
    echo "🔑  APP_KEY topilmadi — .env yaratib, kalit generatsiya qilinmoqda..."
    if [ ! -f /var/www/html/.env ]; then
        cp /var/www/html/.env.example /var/www/html/.env
        echo "📝  .env.example dan .env yaratildi."
    fi
    php artisan key:generate --force
    # Yangi kalitni joriy jarayonga yuklaymiz
    APP_KEY=$(grep '^APP_KEY=' /var/www/html/.env | cut -d '=' -f2-)
    export APP_KEY
    echo "✅  APP_KEY muvaffaqiyatli yaratildi."
else
    echo "🔑  APP_KEY docker-compose env dan o'qildi."
fi

# Cache Laravel configurations
# Xato bo'lsa clear qilamiz — cache bo'lmasa ham ishlaydi, faqat sekinroq
echo "⚙️  Caching configurations..."
php artisan config:clear
php artisan config:cache || { echo "⚠️  config:cache failed — running without cache"; php artisan config:clear; }

echo "🗺️  Caching routes..."
php artisan route:clear
php artisan route:cache || { echo "⚠️  route:cache failed — running without cache"; php artisan route:clear; }

echo "👁️  Caching views..."
php artisan view:clear
php artisan view:cache || { echo "⚠️  view:cache failed — running without cache"; php artisan view:clear; }

# Run database migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force --no-interaction || echo "⚠️  Migration failed (DB may not be ready), continuing..."

# Auto-seed from Supabase if local DB is empty (safe no-op if already populated)
echo "🌱  Checking if local DB needs seeding from Supabase..."
php artisan db:seed-from-supabase || echo "ℹ️  Supabase seed skipped (Supabase may not be configured or local DB is already populated)."

# Laravel log — 500 xatoliklarni debugging uchun
echo "📋 Laravel log (last 30 lines):"
tail -n 30 /var/www/html/storage/logs/laravel.log 2>/dev/null || echo "(log empty or not found)"

echo "✅ Starting process..."
if [ $# -gt 0 ]; then
    exec "$@"
else
    exec php-fpm
fi
