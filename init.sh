#!/bin/sh
set -e

echo "=== Starting application ==="
pnpm run db:deploy
exec "$@"
