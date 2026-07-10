# AURA GEM ERP — Architecture

## 1. System Overview

```
┌────────────┐     HTTPS      ┌───────────┐    REST /api/v1     ┌───────────┐
│  Browser    │ ─────────────▶ │  NGINX    │ ──────────────────▶ │  NestJS   │
│ (Next.js)   │                │ reverse   │                     │  API      │
└────────────┘                │  proxy    │                     └─────┬─────┘
                              └───────────┘                           │ Prisma
                                                                ┌─────▼─────┐
                              ┌───────────┐   signed URLs      │ PostgreSQL │
                              │ S3/Supabase│◀──────────────────└───────────┘
                              │  Storage   │
                              └───────────┘
```

- **web/** — Next.js 15 App Router. All data fetching via TanStack Query against the REST API. JWT stored in httpOnly-style client storage with silent refresh.
- **api/** — NestJS modular monolith. One module per business domain. Global `ValidationPipe`, `JwtAuthGuard`, `RolesGuard`, `AuditInterceptor`.
- **db** — PostgreSQL 16, fully normalized (see ER-DIAGRAM.md). Prisma migrations are the single source of schema truth.

## 2. Backend Module Map

| Module | Responsibility |
|---|---|
| `auth` | Login, refresh, logout, JWT issuing, password hashing (bcrypt) |
| `users` | User CRUD, role assignment |
| `stones` | Inventory CRUD, stone codes, QR/barcode payloads, images/documents, timeline |
| `workflow` | Workflow templates, per-stone stage plans, stage transitions |
| `splitting` | Split parent → children, cost allocation (by weight / manual) |
| `treatments` | Gas heat batches + electric treatment progress tracking |
| `cutting` | Cutting records, weight loss %, cost |
| `certifications` | Labs, certificates, PDFs/images |
| `financials` | Expense categories, stone expenses, profit engine |
| `exports` | Shipments, buyers, invoices, tracking, sale records |
| `dashboard` | Aggregated KPIs and chart series |
| `reports` | Income statement, cash flow, inventory, treatment, purchase, export reports; CSV/Excel/PDF generation |
| `notifications` | Dashboard alerts (treatment due, missing certificates, pending exports) |
| `settings` | Gem types, locations, machines, sellers, labs, treatment types, backup/restore |
| `audit` | Append-only audit trail, queryable |
| `storage` | Upload endpoints; disk driver (dev) / S3-Supabase driver (prod) |

## 3. Role-Based Access Control

Permissions are enforced with a `@Roles(...)` decorator + `RolesGuard`. Matrix (✓ = full, R = read-only):

| Module            | SUPER_ADMIN | OWNER | MANAGER | FINANCE | INVENTORY | HEAT_OP | VIEWER |
|-------------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard         | ✓ | ✓ | ✓ | ✓ | ✓ | R | R |
| Inventory         | ✓ | ✓ | ✓ | R | ✓ | R | R |
| Splitting         | ✓ | ✓ | ✓ | — | ✓ | — | R |
| Heat/Electric     | ✓ | ✓ | ✓ | — | R | ✓ | R |
| Cutting           | ✓ | ✓ | ✓ | — | ✓ | — | R |
| Certification     | ✓ | ✓ | ✓ | — | ✓ | — | R |
| Financials        | ✓ | ✓ | ✓ | ✓ | — | — | R |
| Exports           | ✓ | ✓ | ✓ | ✓ | — | — | R |
| Reports           | ✓ | ✓ | ✓ | ✓ | R | — | R |
| Settings          | ✓ | ✓ | — | — | — | — | — |
| Users/Roles       | ✓ | ✓ | — | — | — | — | — |
| Audit Logs        | ✓ | ✓ | R | — | — | — | — |

## 4. Stone Workflow Engine

Workflows are data, not code.

- `WorkflowTemplate` defines an ordered set of `WorkflowTemplateStage` rows (stage kind + required flag).
- When a stone is created the template is **copied** into `StoneStage` rows on the stone — the per-stone plan can then be edited (skip / add stages) without affecting the template.
- Stage kinds: `PURCHASE, INSPECTION, CRACK_REMOVAL, SPLITTING, GAS_HEAT, ELECTRIC_TREATMENT, CUTTING, POLISHING, CERTIFICATION, EXPORT_SALE`.
- Each `StoneStage` has status `NOT_APPLICABLE | PENDING | IN_PROGRESS | COMPLETED | SKIPPED`, timestamps, and links to the domain record that fulfilled it (batch, cutting record, certificate, shipment…).
- The stone's `status` column is a denormalized projection of the active stage, kept in sync by the workflow service.
- Completing a stage writes an immutable `StoneEvent` (the timeline) and an `AuditLog` row.

Seeded templates: **A** Direct Sale, **B** Rough Processing, **C** Geuda Heat Treatment, **D** Already Cut.

## 5. Splitting & Cost Allocation

`POST /stones/:id/split` accepts `{ children: [{weightCt, allocatedCost?, ...}], allocation: 'BY_WEIGHT' | 'MANUAL' }`.

Inside a single transaction:
1. Validate the parent is splittable (not already split/sold/exported).
2. Create children with codes `PARENTCODE-A, -B, …`, copying provenance (purchase date/location/seller/origin) and linking `parentId`.
3. Allocate `purchaseCost`: by weight → `parentCost × childWeight / Σweights` (remainder cents to the last child); manual → validated to sum exactly to parent cost.
4. Parent status → `SPLIT`, archived. `SplitEvent` + `StoneEvent`s recorded.

## 6. Financial Engine

Per stone: `totalCost = allocatedPurchaseCost + Σ StoneExpense.amount` (expenses span heat, electric, cutting, certification, transport, commission, export, tax and any owner-defined category).
On sale/export: `grossProfit = salePrice − purchaseCost`, `netProfit = salePrice − totalCost`, `profitPct = netProfit / totalCost`, `ROI = netProfit / totalInvestment`. Computed server-side in `ProfitService`, exposed on stone detail and reports.

## 7. Audit

`AuditInterceptor` wraps every mutating request; services call `AuditService.log({ userId, action, entity, entityId, before, after, ip, userAgent })`. The table is append-only — no update/delete endpoints exist, and the DB user for the app can be granted only INSERT/SELECT on it in production.

## 8. Non-Functional

- **Validation** — Zod on the client, class-validator DTOs on the server (whitelist + forbidNonWhitelisted).
- **Pagination** — cursor-free page/limit with total counts; all list endpoints support `search`, `sort`, and typed filters.
- **Security** — helmet, CORS allowlist, bcrypt(12), short-lived access tokens (15 min) + rotating refresh tokens (7 d), rate limiting on auth.
- **Errors** — global exception filter returns RFC-7807-style bodies; the web app maps them to toasts and form errors.
- **Money** — stored as `Decimal(14,2)` (never floats); weights as `Decimal(10,3)` carats.
