#!/bin/sh
set -e

echo "🚀 Starting PropTech UZ Docker Entrypoint..."

# Ensure storage directories exist and are writable
mkdir -p /var/www/html/storage/framework/cache
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
mkdir -p /var/www/html/storage/logs
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Cache Laravel configurations for maximum performance
echo "⚙️  Caching configurations, routes, and views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations in production
echo "🗄️  Running database migrations..."
php artisan migrate --force

echo "🔥 Launching Supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
