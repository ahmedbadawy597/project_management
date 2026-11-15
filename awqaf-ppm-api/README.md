# Awqaf PPM API

NestJS + Prisma + PostgreSQL backend for the Awqaf PPM monorepo (`../`).

## Quick start (local)

```bash
docker compose up -d          # Postgres on host :5435
npm install
npx prisma migrate deploy
npm run start:dev             # http://localhost:3001/api
```

On first start with an empty DB, **AUTO_SEED** creates the official 10 users + project.  
Temp password: `Awqaf@2026`.

Swagger: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

## Production (from monorepo root)

```bash
# from repo root
docker compose up -d --build
```

Entrypoint runs migrations, then Nest. Seed runs automatically if `person` table is empty.

## Env

See `.env.example`:

| Variable | Default | Meaning |
|----------|---------|---------|
| `AUTO_SEED` | `true` | Seed users/projects when DB empty |
| `FORCE_SEED` | `false` | Wipe + reseed on every start (dev only) |
| `ENABLE_DEMO_RESET` | `true` local / `false` server | Allow `POST /api/demo/reset` |
| `JWT_SECRET` | — | **Required** strong secret in production |
| `CORS_ORIGIN` | frontend origin | Browser origin allowed |

## Auth

`POST /api/auth/login` — `{ "username", "password" }`
