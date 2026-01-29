#!/bin/bash
# Clear Next.js caches and restart dev server

echo "Stopping any running dev servers..."
pkill -f "next dev" || true

echo "Clearing .next cache..."
rm -rf .next

echo "Clearing Turbopack cache..."
rm -rf .turbo

echo "Starting dev server..."
npm run dev
