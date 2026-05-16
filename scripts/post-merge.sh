#!/bin/bash
set -e

echo "Running post-merge setup..."

npm install --legacy-peer-deps

if [ "${SKIP_DB_PUSH:-}" = "1" ]; then
  echo "Skipping database schema sync."
else
  echo "Syncing database schema..."
  npx drizzle-kit push --config=drizzle.config.ts
fi

echo "Post-merge setup complete."
