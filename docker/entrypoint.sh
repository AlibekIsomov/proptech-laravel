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

# Wait a moment for DB to be ready (if needed)
echo "⏳ Waiting for services..."
sleep 2

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

echo "✅ Starting PHP-FPM..."
exec php-fpm
