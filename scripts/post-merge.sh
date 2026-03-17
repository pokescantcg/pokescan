#!/bin/bash
set -e

echo "Running post-merge setup..."

npm install --legacy-peer-deps

echo "Syncing database schema..."
npx drizzle-kit push --config=drizzle.config.ts

echo "Post-merge setup complete."
