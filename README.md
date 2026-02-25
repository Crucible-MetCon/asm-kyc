# ASM Gold Trace

Production-grade, offline-first PWA for artisanal and small-scale mining (ASM) gold traceability and LBMA/OECD-aligned due diligence intake. Built for deployment in rural Zambia.

**Phase 1 of 8** — Foundation: monorepo, database, auth, RBAC, PWA shell.

## Prerequisites

- Node.js 20+ (tested on v24)
- pnpm 9+ (`npm install -g pnpm`)
- Docker Desktop (for Postgres) or a PostgreSQL 16 instance

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Postgres (via Docker)
docker compose up -d

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed test users
pnpm db:seed

# Start all dev servers
pnpm dev
```

## Dev Servers

| App | URL | Description |
|-----|-----|-------------|
| API | http://localhost:3001 | Fastify REST API |
| Miner PWA | http://localhost:5173 | Mobile-first miner/trader app |
| Admin Web | http://localhost:5174 | Admin dashboard |

## Test Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN_USER |
| miner1 | miner123 | MINER_USER |
| trader1 | trader123 | TRADER_USER |

## Project Structure

```
asm-kyc/
├── apps/
│   ├── api/          — Fastify + TypeScript API server
│   ├── miner-pwa/    — Vite + React mobile PWA
│   └── admin-web/    — Vite + React admin dashboard
├── packages/
│   ├── database/     — Prisma schema + client
│   └── shared/       — Zod schemas + TypeScript types
├── docker-compose.yml
└── package.json
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all 3 dev servers concurrently |
| `pnpm dev:api` | Start only the API server |
| `pnpm dev:miner` | Start only the Miner PWA |
| `pnpm dev:admin` | Start only the Admin Web |
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed test users |
| `pnpm db:studio` | Open Prisma Studio |

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://asm:asm_dev_password@localhost:5432/asm_kyc | Postgres connection |
| SESSION_SECRET | (change me) | Secret for cookie signing |
| PORT | 3001 | API server port |
| NODE_ENV | development | Environment |

## API Endpoints (Phase 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register a new miner/trader |
| POST | /auth/login | No | Log in, receive session cookie |
| POST | /auth/logout | No | Log out, clear session |
| GET | /me | Yes | Get current user + profile |
| GET | /health | No | Health check |
