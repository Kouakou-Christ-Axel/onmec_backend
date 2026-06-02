#!/bin/sh
set -e

echo "=== Starting application ==="
/app/node_modules/.bin/prisma migrate deploy
exec "$@"
