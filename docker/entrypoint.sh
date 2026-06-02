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

# Storage symlink — public/storage → storage/app/public
# Bu bo'lmasa fayl yuklash va media xizmat 500 xato beradi
echo "🔗  Creating storage symlink..."
php artisan storage:link --force 2>/dev/null || echo "⚠️  storage:link warning (may already exist)"

# Wait a moment for DB to be ready (if needed)
echo "⏳ Waiting for services..."
sleep 2

# APP_KEY tekshiruv — yo'q bo'lsa avtomatik generate qilamiz
# Bu bo'lmasa "No application encryption key" xatosi chiqadi (500 error)
if [ -z "${APP_KEY}" ] || [ "${APP_KEY}" = "" ]; then
    echo "🔑  APP_KEY topilmadi — yangi kalit generatsiya qilinmoqda..."
    php artisan key:generate --force
    echo "✅  APP_KEY muvaffaqiyatli yaratildi."
else
    echo "🔑  APP_KEY mavjud."
fi

# Cache Laravel configurations
echo "⚙️  Caching configurations..."
php artisan config:clear
php artisan config:cache

echo "🗺️  Caching routes..."
php artisan route:clear
php artisan route:cache

echo "👁️  Caching views..."
php artisan view:clear
php artisan view:cache

# Run database migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force --no-interaction || echo "⚠️  Migration failed (DB may not be ready), continuing..."

# Auto-seed from Supabase if local DB is empty (safe no-op if already populated)
echo "🌱  Checking if local DB needs seeding from Supabase..."
php artisan db:seed-from-supabase || echo "ℹ️  Supabase seed skipped (Supabase may not be configured or local DB is already populated)."

# Laravel log — 500 xatoliklarni debugging uchun
echo "📋 Laravel log (last 30 lines):"
tail -n 30 /var/www/html/storage/logs/laravel.log 2>/dev/null || echo "(log empty or not found)"

echo "✅ Starting PHP-FPM..."
exec php-fpm
