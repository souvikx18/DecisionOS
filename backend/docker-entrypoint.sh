#!/bin/sh
set -e

echo "🚀 [DecisionOS] Initializing backend container..."

# Wait for database connection and apply schema
echo "📦 [DecisionOS] Applying Prisma database schema migrations..."
npx prisma db push --skip-generate || echo "⚠️ Prisma schema push completed or skipped"

# Optional: seed if required
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 [DecisionOS] Seeding initial demo data..."
  node prisma/seed.js || echo "⚠️ Seeding skipped or already applied"
fi

echo "✨ [DecisionOS] Starting Node.js API server & BullMQ background workers..."
exec "$@"
