#!/bin/sh
# pg-ensure-password.sh
# PostgreSQL ni ishga tushiradi va har safar POSTGRES_PASSWORD ni majburiy qo'yadi.
# Sabab: POSTGRES_PASSWORD faqat birinchi marta (volume bo'sh bo'lganda) ishlaydi.
# Volume mavjud bo'lsa, parol o'zgarmaydi — bu script shu muammoni hal qiladi.

set -e

echo "🐘 Starting PostgreSQL with password enforcement..."

# PostgreSQL ni background da ishga tushiramiz
docker-entrypoint.sh postgres &
PG_PID=$!

# PostgreSQL tayyor bo'lguncha kutamiz (peer auth orqali — parolsiz)
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -U "${POSTGRES_USER:-postgres}" -q 2>/dev/null; do
    sleep 1
done

echo "🔑 Ensuring password is always correct..."
# Peer auth (konteyner ichidan postgres useri sifatida) — parolsiz kirish mumkin
psql -U "${POSTGRES_USER:-postgres}" -c \
    "ALTER USER ${POSTGRES_USER:-postgres} WITH PASSWORD '${POSTGRES_PASSWORD}';" \
    2>/dev/null && echo "✅ Password enforced successfully." \
    || echo "⚠️  Password enforcement skipped (may already be correct)."

# Asosiy PostgreSQL jarayoni tugaguncha kutamiz
wait $PG_PID
