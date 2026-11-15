#!/bin/sh
set -e

echo "[api] Running Prisma migrations…"
npx prisma migrate deploy

echo "[api] Starting NestJS (auto-seeds users/projects if DB is empty)…"
exec node dist/src/main
