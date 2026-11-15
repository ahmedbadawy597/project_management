# Awqaf PPM

Ministry of Awqaf – Project Portfolio Management (**frontend + backend** monorepo).

| Path | Role |
|------|------|
| `/` | React frontend (Vite) |
| `awqaf-ppm-api/` | NestJS + Prisma + PostgreSQL API |

## Official seed (created on first server start)

When the API starts against an **empty** database it automatically creates:

- **10 users** (admin, PMs, developers) — usernames from email local-part  
- **1 project** — Ministry of Awqaf Digital Applications Management  
- **Application registry** for that project  

Default temporary password for all seeded users: **`Awqaf@2026`** (forced change on first login).

## Server deploy (DevOps)

```bash
git clone https://github.com/ahmedbadawy597/project_management.git
cd project_management

# Optional: copy and edit secrets
cp .env.production.example .env

docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Web UI | `http://<server>/` |
| API | `http://<server>:3001/api` |
| Swagger | `http://<server>:3001/api/docs` |

What happens on first boot:

1. Postgres starts  
2. API runs `prisma migrate deploy`  
3. API auto-seeds users + project if DB is empty (`AUTO_SEED=true`)  
4. Nginx serves the UI and proxies `/api` → Nest  

## Local development

### API

```bash
cd awqaf-ppm-api
docker compose up -d          # Postgres on :5435
npm install
npx prisma migrate deploy
npm run start:dev             # seeds if empty; http://localhost:3001/api
```

### Frontend

```bash
# repo root
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:3001/api
npm install --legacy-peer-deps
npm run dev
```

MSW is used only when `VITE_API_BASE_URL` is unset.

## Scripts (root)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite frontend |
| `npm run build` | Production frontend build |
| `npm run api:dev` | Nest watch mode |
| `npm run api:seed` | Force reseed via Prisma CLI |
| `npm run ci` | lint + test + build |

## Auth

`POST /api/auth/login` with `{ "username": "ahmed.badawy", "password": "Awqaf@2026" }`  
(or full email). Send `Authorization: Bearer <token>` afterward.
