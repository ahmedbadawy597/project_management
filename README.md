# Awqaf PPM

Ministry of Awqaf – Project Portfolio Management frontend.

Professional portfolio PPM UI with **mock API (MSW)**, **persona login / RBAC**, React Query, EN/AR + RTL, and persisted mock data.

## Stack

React 19, TypeScript, Vite, Tailwind CSS, TanStack Query + Table, Zustand (UI prefs only), MSW, react-i18next, Recharts, custom Gantt schedule.

## Run

```bash
npm install --legacy-peer-deps
npm run dev
```

Open the app and sign in with a demo persona (Director, PM, Analyst, Viewer).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite + MSW mock API |
| `npm run build` | Typecheck + production build |
| `npm run lint` | oxlint on `src/` |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright persona smoke |
| `npm run ci` | lint + test + build |

## Architecture

```
UI pages → React Query hooks → apiFetch(/api/...) → MSW handlers → mock DB (localStorage)
                                                              ↘ future real API via VITE_API_BASE_URL
Auth: session token in sessionStorage · capabilities from persona role
UI prefs: language, sidebar, density in Zustand (`awqaf-ppm-ui`)
```

Set `VITE_API_BASE_URL` (see `.env.example`) to bypass MSW and call a real backend with the same route shapes under `src/api/endpoints.ts`.

## Personas (RBAC)

| Persona | Can decide approvals | Admin |
|---------|----------------------|-------|
| Portfolio Director | Yes | Yes |
| Project Manager | No | No |
| PMO Analyst | No | No |
| Executive Viewer | No (limited nav) | No |

## Notes

- Currency: SAR · Seed portfolio: 12 applications (4 active / 8 planned)
- Mock DB key: `awqaf-ppm-mock-db` · Reset from **Settings**