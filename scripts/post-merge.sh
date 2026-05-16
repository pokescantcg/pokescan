#!/bin/bash
set -e

echo "Running post-merge setup..."

npm install --legacy-peer-deps

echo "Skipping database schema sync."

echo "Post-merge setup complete."
