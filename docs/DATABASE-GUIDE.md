# AURA GEM ERP — Database Guide (Complete)

> Everything about your database: what it is, how to open it and see the tables and
> data, how to back it up, why it's local instead of cloud, and how to run it for
> **10+ gem businesses**. Written for someone who has never managed a database.

---

## 1. What your database actually is

| Thing | Value |
|-------|-------|
| **Type** | PostgreSQL 16 (a professional, free, open-source database) |
| **Where it runs** | Inside Docker — the container named **`aura-db`** (you saw it in Docker Desktop) |
| **Database name** | `aura_gem_erp` |
| **Username** | `aura` |
| **Password** | `aura_dev_password` (dev default — change for production) |
| **Host / Port** | `localhost` : **5433** |
| **Where the data physically lives** | A Docker **volume** called `gemerpsystem_db_data` (survives container restarts) |

The app never touches the database directly — it goes through **Prisma** (the tool that
maps your code to database tables). You defined every table once in
`api/prisma/schema.prisma`, and Prisma created them in PostgreSQL.

---

## 2. How to SEE your tables and data (4 ways)

### ⭐ Way 1 — Prisma Studio (easiest, visual, recommended)

Your project has a built-in visual database browser. No installation needed.

```powershell
# in the api folder
cd api
npx prisma studio
```

- It opens **http://localhost:5555** in your browser automatically.
- You'll see **every table on the left** (users, stones, sale_records…).
- Click a table → see all its rows in a spreadsheet-like view.
- You can filter, sort, and even edit/add/delete rows by hand (be careful — it's the real data).
- Press `Ctrl+C` in the terminal to stop it when done.

> Requirement: Docker + the `aura-db` container must be running (`docker compose up -d db`).
> Prisma Studio reads the connection from `api/.env`, so it just works.

This is the answer to "how do I see the database tables" — run those two lines.

### Way 2 — psql inside the container (command line)

For quick SQL queries without any GUI:

```powershell
docker exec -it aura-db psql -U aura -d aura_gem_erp
```

You're now inside the database. Useful commands (note the backslashes):

| Command | What it shows |
|---------|---------------|
| `\dt` | List all tables |
| `\d stones` | Show the columns of the `stones` table |
| `SELECT code, status, "purchaseCost" FROM stones;` | Query stone rows |
| `SELECT COUNT(*) FROM stones;` | Count stones |
| `\q` | Quit |

*(Column names with capital letters need double quotes, e.g. `"purchaseCost"`.)*

### Way 3 — A desktop GUI tool (DBeaver / pgAdmin / TablePlus)

If you prefer a full graphical tool (nice for exploring, exporting, charts):

1. Install **DBeaver** (free) or **TablePlus**.
2. New connection → PostgreSQL → enter:
   - Host `localhost`, Port `5433`, Database `aura_gem_erp`, User `aura`, Password `aura_dev_password`
3. Connect → browse tables, run SQL, export to Excel, etc.

### Way 4 — Docker Desktop

In Docker Desktop, click the `aura-db` container → the **">_" (Exec)** tab gives you a
terminal inside it, where you can run the `psql` command from Way 2.

---

## 3. The tables, explained (your data map)

Your database has ~30 tables. Here's what each group holds:

| Group | Tables | Holds |
|-------|--------|-------|
| **Login** | `users`, `refresh_tokens` | Accounts and login sessions |
| **Company** | `company_profile` | The one row: "Abeywardhane Gems" |
| **Master data** | `gem_types`, `purchase_locations`, `sellers`, `buyers`, `machines`, `laboratories`, `expense_categories` | The dropdown lists you manage in Settings |
| **Workflow engine** | `workflow_templates`, `workflow_template_stages`, `stone_stages` | The A/B/C/D workflows + each stone's stage plan |
| **Stones (core)** | `stones`, `stone_events`, `stone_images`, `stone_documents` | Every stone, its timeline, photos, files |
| **Splitting** | `split_events` | Parent→children split records |
| **Treatments** | `treatment_batches`, `treatment_batch_stones`, `treatment_images`, `electric_treatments`, `electric_progress_logs` | Gas heat batches + electric runs |
| **Cutting** | `cutting_records` | Weight-loss and cost per cut |
| **Certification** | `certifications` | Lab certificates |
| **Money** | `stone_expenses`, `company_expenses` | Per-stone costs + overheads |
| **Sales/Export** | `export_shipments`, `export_items`, `export_documents`, `sale_records` | Shipments and frozen profit records |
| **System** | `audit_logs`, `notifications`, `counters` | Change history, alerts, code counters (G0001…) |

The most important tables for the business are **`stones`** (every gem) and
**`sale_records`** (the frozen profit for each sale).

---

## 4. Backups — the most important habit

A gem business losing its inventory records is a disaster. **Back up regularly.**

### Simple backup (a single file you can restore anywhere)

```powershell
# Creates a full dump of the whole database into backup.sql
docker exec aura-db pg_dump -U aura -d aura_gem_erp > backup_2026-07-08.sql
```

Store that file somewhere safe (external drive, cloud drive). To **restore** it later:

```powershell
# Into a fresh empty database
type backup_2026-07-08.sql | docker exec -i aura-db psql -U aura -d aura_gem_erp
```

### In-app backup

The system also has **Settings → Backup → Download Full Backup**, which saves a JSON
snapshot of every table. Good as a secondary safety net.

> Recommendation: schedule the `pg_dump` command to run daily (Windows Task Scheduler)
> and keep the last 30 days of files. For a real business, automated daily backups are
> non-negotiable.

---

## 5. Why LOCAL database instead of cloud (Supabase)?

An honest comparison — there's no single right answer, it depends on how you sell it.

### Local (current: PostgreSQL in Docker on the customer's machine/server)

| ✅ Advantages | ❌ Disadvantages |
|--------------|------------------|
| **Free** — no monthly cloud bill | The customer's PC/server must stay **on** to use it |
| **Data stays on-premise** — nothing leaves their building (gem businesses value privacy) | **Backups are their responsibility** (easy to forget → data loss) |
| **Works offline** — no internet needed | **You can't support/update it remotely** without access |
| **Full control** — no third party | Each machine must be maintained separately |
| Simple for a single handover | Doesn't scale smoothly to many customers |

### Cloud (e.g. Supabase / Neon / AWS RDS — a managed PostgreSQL online)

| ✅ Advantages | ❌ Disadvantages |
|--------------|------------------|
| **Automatic backups** (managed for you) | **Monthly cost** per database (~$0–25+ each) |
| **Access from anywhere** — you can support remotely | Needs **internet** to use |
| No customer machine needs to stay on | Data lives on a **third-party** server |
| **Easier to run many customers** centrally | Slightly more setup |

### Why it's local right now

During development and for the first handover, local Docker is the pragmatic choice:
zero cost, simple, private, and it proved the whole system works. **But the app is not
locked to local** — switching to cloud is literally **one line**: change `DATABASE_URL`
in `api/.env` to a Supabase/Neon connection string, then `migrate` + `seed`. Everything
else stays the same. That flexibility is already built in.

---

## 6. Running it for 10+ businesses — the scaling playbook

You have three models. Your architecture (single-tenant: one isolated database per
business) supports the first two **today** with no code changes.

### Model A — Self-hosted, one copy per business (current model, on their premises)
Each business runs the full Docker stack on their own PC/server.
- **Best when:** customers insist their data stays in-house; they have a machine that stays on.
- **Your effort per customer:** install Docker + deploy once; updates require visiting/remoting into each machine.
- **Cost:** free (they own the hardware).

### Model B — Cloud-hosted, one deployment per business (recommended for 10+) ⭐
Each business gets its **own** app + **own** cloud database, but hosted by you (a cheap
cloud server per customer, or one server running several isolated stacks; database on
Supabase/Neon per customer).
- **Best when:** you want to run it as a paid service and support many customers without site visits.
- **Your effort per customer:** spin up a deployment, set their `.env` (company name, owner, DB URL). Updated centrally by redeploying the new image.
- **Cost:** a small monthly hosting + DB fee per customer (you'd fold this into what you charge them).
- **Why recommended:** managed backups, you can fix/update/support remotely, no dependency on the customer's PC being on, and data stays fully isolated per business.

### Model C — One shared system for all (multi-tenant SaaS) — NOT built
One deployment serves every business with internal separation (`tenantId` on every row).
- **Best when:** you reach dozens/hundreds of customers and want the lowest running cost.
- **Cost of switching:** a **major rewrite** (every table and query changes), plus the risk that one bug/breach affects everyone. **Not worth it** at 10–20 customers.

### Recommended path for you (a solo dev, 10+ gem businesses)

1. **Keep the single-tenant design** (one isolated deployment per business) — you already have it, and it's the safest (no customer can ever see another's data).
2. **Standardize onboarding** — you already can: set 4 values in `.env` + `migrate deploy` + `seed`. That's your "new customer" recipe.
3. **For the database, offer two tiers:**
   - Customers who want on-premise → Model A (local Docker), and you set up **automatic daily backups** on their machine (Task Scheduler + `pg_dump`).
   - Customers who want hands-off / you-managed → Model B (cloud DB like Supabase/Neon), where backups and remote support are far easier.
4. **Publish updates via the Docker images** your GitHub pipeline already builds
   (`gem-erp-system-api`, `gem-erp-system-web`). Rolling out a new version = each
   deployment pulls the new image and restarts.
5. **Track your customers** — keep a simple sheet: business name, model (A/B), server/URL,
   DB location, admin credentials, last backup, version deployed.

> Bottom line: **don't rebuild it as one big shared system.** Keep giving each business
> its own isolated copy. Move the database to the cloud (Model B) as you grow past a
> handful of customers — it's a one-line config change, and it makes supporting many
> businesses realistic for one person.

---

## 7. Cheat sheet

```powershell
# See tables & data (visual) — run in api\, needs Docker db running
npx prisma studio                     # opens http://localhost:5555

# Quick SQL in the terminal
docker exec -it aura-db psql -U aura -d aura_gem_erp
#   \dt            list tables
#   \d stones      describe a table
#   \q             quit

# Back up the whole database to a file
docker exec aura-db pg_dump -U aura -d aura_gem_erp > backup.sql

# Restore a backup
type backup.sql | docker exec -i aura-db psql -U aura -d aura_gem_erp

# Switch to a cloud database (Supabase/Neon): edit api\.env
#   DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB"
# then, in api\:  npx prisma migrate deploy  &&  npm run seed
```

**Connection details** (for any GUI tool): host `localhost`, port `5433`, database
`aura_gem_erp`, user `aura`, password `aura_dev_password`.

See also: [DOCKER-GUIDE.md](DOCKER-GUIDE.md) · [TEST-PLAN.md](TEST-PLAN.md) · [README.md](../README.md)
