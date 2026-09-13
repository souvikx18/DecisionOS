#!/bin/sh
set -e

echo "🚀 [DecisionOS] Initializing backend container..."

# (Migrations should be run manually or via CI, not on every container start)
echo "📦 [DecisionOS] Skipping automatic schema push in production..."

# Optional: seed if required
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 [DecisionOS] Seeding initial demo data..."
  node prisma/seed.js || echo "⚠️ Seeding skipped or already applied"
fi

echo "✨ [DecisionOS] Starting Node.js API server & BullMQ background workers..."
exec "$@"
