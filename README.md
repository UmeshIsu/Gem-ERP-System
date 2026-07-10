# AURA GEM ERP

**Enterprise Gemstone Resource Planning System** — a premium ERP platform purpose-built for the Sri Lankan gemstone industry.

AURA manages the complete gemstone lifecycle: **Purchase → Inspection → Crack Removal → Splitting → Heat Treatment → Electric Treatment → Cutting → Certification → Export → Financials → Reports → Audit**.

Every stone carries a permanent, immutable history from the day it is purchased until it leaves the company. Nothing is ever deleted. Everything is traceable.

---

## Monorepo Layout

```
.
├── api/          # NestJS backend (REST API, Prisma, PostgreSQL)
├── web/          # Next.js 15 frontend (App Router, Tailwind, shadcn/ui)
├── nginx/        # Reverse-proxy configuration
├── docs/         # Architecture, ER diagram, user flows
├── docker-compose.yml
└── README.md
```

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, React Hook Form, Zod, TanStack Table, Recharts, TanStack Query |
| Backend    | Node.js, NestJS 10, class-validator DTOs |
| Database   | PostgreSQL 16 |
| ORM        | Prisma |
| Auth       | JWT (access + refresh), Role-Based Access Control |
| Storage    | Supabase Storage / AWS S3 (pluggable driver, local disk in dev) |
| Deployment | Docker, Docker Compose, NGINX |

## User Roles

`SUPER_ADMIN`, `OWNER`, `MANAGER`, `FINANCE_OFFICER`, `INVENTORY_OFFICER`, `HEAT_OPERATOR`, `VIEWER` — each with granular per-module permissions (see `docs/ARCHITECTURE.md`).

## Quick Start (Development)

```bash
# 1. Start PostgreSQL
docker compose up -d db

# 2. Backend
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev          # http://localhost:4000/api/v1

# 3. Frontend
cd ../web
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

Default seed login (configurable — see below): `owner@abeywardhanegems.lk` / `Abeywardhane@2026`

## Selling to Another Gem Company (single-tenant onboarding)

AURA is **single-tenant**: every gem company runs its own deployment with its own database, so their data is fully isolated. To set up a new customer:

1. Deploy a fresh copy (own server/database).
2. In `api/.env`, set their identity:
   ```env
   COMPANY_NAME="Their Company Name"
   OWNER_NAME="Owner Name"
   OWNER_EMAIL="owner@theircompany.lk"
   OWNER_PASSWORD="StrongPassword"
   SEED_SAMPLE_DATA=false          # true only for a sales demo
   ```
3. `npx prisma migrate deploy && npm run seed`

That's it — the login screen and sidebar are branded to their company, and only the owner account exists (they add their own staff under **Settings → Users**). The owner can rename the company later at **Settings → Company**. A hidden `SUPPORT_*` SUPER_ADMIN account (for you, the vendor) is created unless you set `SEED_SUPPORT_ACCOUNT=false`.

## Production

```bash
docker compose up -d --build
# NGINX serves the app on http://localhost (port 80)
```

## Documentation

- [Architecture & Module Design](docs/ARCHITECTURE.md)
- [ER Diagram](docs/ER-DIAGRAM.md)
- [User Flows & Workflow Engine](docs/USER-FLOWS.md)

## Core Domain Concepts

- **Stone Workflow Engine** — workflows are *not* hardcoded. Each stone gets a per-stone stage plan (crack removal / split / gas heat / electric / cutting / certification each optional) derived from a configurable `WorkflowTemplate` (Direct Sale, Rough Processing, Geuda Heat Treatment, Already Cut) and overridable per stone.
- **Splitting** — a parent stone becomes N child stones (`G0001 → G0001-A…`). The parent is archived (`SPLIT`), never deleted. Children inherit purchase provenance and audit history; cost is allocated **by weight** or **manually**.
- **Financials** — unlimited owner-defined expense categories; per-stone cost ledger; automatic total investment, gross/net profit, profit % and ROI.
- **Audit Log** — append-only; every mutation records who, when, old value, new value, IP and user agent.
