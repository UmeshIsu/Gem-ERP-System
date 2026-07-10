# Docker — A Complete Guide (for AURA GEM ERP)

> Written for someone who has **never used Docker before**. It explains what Docker
> is, why this project uses it, exactly what it does here, the commands you'll
> actually type, and how to fix the problems you already ran into.

---

## 1. The problem Docker solves

Software rarely runs on just one thing. AURA GEM ERP needs:

- **PostgreSQL** (the database that stores every stone, user, sale…)
- **Node.js** (to run the backend and frontend)
- A specific **version** of each, configured a specific way.

Historically, to run a database you had to *install* PostgreSQL on your computer,
pick a version, configure users and passwords, and hope it matched what the
project expected. On the next computer, a different version or a missed setting
meant **"but it works on my machine!"** — the classic developer nightmare.

**Docker fixes this by packaging software + its exact setup into a sealed, portable
box** that runs the same way on any computer — your Windows laptop, a colleague's
Mac, or a cloud server. You don't install PostgreSQL; you *run its Docker box*.

### The shipping-container analogy

Before shipping containers, cargo was loaded loose — every ship, truck and crane
handled it differently, and things broke. The **standard steel container** changed
everything: whatever is inside, the container has the same shape, so any ship or
crane handles it identically.

Docker does this for software. Whatever is inside (Postgres, Node, anything), the
**container** has a standard shape, so any computer with Docker runs it the same
way. That's literally why the logo is a whale carrying containers. 🐳

---

## 2. The core ideas (only four you must know)

| Term | What it is | Kitchen analogy |
|------|-----------|-----------------|
| **Image** | A read-only *template* — software + its setup, frozen. e.g. `postgres:16-alpine`. | A **recipe** |
| **Container** | A *running copy* of an image. You can start/stop/delete it. | The **cooked dish** made from the recipe |
| **Volume** | Storage that **survives** even if the container is deleted. | The **fridge** — food stays even after you wash the pan |
| **Docker Compose** | A file that describes several containers and runs them together with one command. | The **full menu + order** for the whole meal |

Key mental model:

- An **image** is a blueprint you download once (from *Docker Hub*, an app store for images).
- A **container** is a live instance of that blueprint. You can run many containers from one image.
- Delete a container and its *internal* data is gone — **unless** it was written to a **volume**.

---

## 3. What's actually on your computer

When you installed Docker on Windows you got a few pieces:

- **Docker Desktop** — the app with the whale tray icon. It's the *control panel* and,
  importantly, it **starts the Docker engine**. If Docker Desktop isn't running,
  nothing Docker-related works. *(This is exactly why your API once failed with
  "Can't reach database server" — the whale wasn't running, so the database
  container was down.)*
- **Docker Engine** — the background service that actually builds images and runs
  containers. Docker Desktop starts it for you.
- **WSL2** (Windows Subsystem for Linux) — Docker containers are Linux inside, so on
  Windows they run in a lightweight, invisible Linux virtual machine that Docker
  Desktop manages. You never touch it directly, but it's why your database "runs on
  Linux" even though your laptop is Windows.

**Practical takeaway:** *Step 1 of using this project is always: make sure Docker
Desktop is running (whale icon in the system tray).*

---

## 4. What Docker does **in AURA GEM ERP**

Your project has a file at the root called **`docker-compose.yml`**. It defines
**four** containers ("services"):

| Service | Image | Job | Used in dev? |
|---------|-------|-----|:---:|
| **db** | `postgres:16-alpine` | The PostgreSQL **database** — stores all your data | ✅ **Yes** |
| **api** | built from `api/Dockerfile` | The NestJS **backend** | Only in production |
| **web** | built from `web/Dockerfile` | The Next.js **frontend** | Only in production |
| **nginx** | `nginx:1.27-alpine` | **Reverse proxy** — front door that routes traffic to web + api on port 80 | Only in production |

### Two different ways you use them

**A) During development (what you do now)** — you only use Docker for the **database**:

```bash
docker compose up -d db      # start ONLY the db container
```

…and you run the backend and frontend yourself with `npm run start:dev` and
`npm run dev`. Why? Because while coding you want instant hot-reload on the api/web,
which is easier running them directly with npm. But the database is a fixed,
external thing you don't edit — so Docker runs it perfectly and saves you from
installing PostgreSQL manually.

**B) In production (when a customer's server runs it)** — you run **all four** with:

```bash
docker compose up -d --build   # build + start db, api, web, nginx together
```

Now Docker runs the entire system. A customer visits `http://the-server` on port 80,
nginx receives it, and routes page requests to **web** and `/api/...` requests to
**api**, which talks to **db**. One command boots the whole ERP. This is Docker's
superpower for **selling to other gem companies**: each customer's server just needs
Docker, then `docker compose up -d --build` — no manual installation of Postgres,
Node, or anything.

---

## 5. Reading your `docker-compose.yml` (line by line concepts)

Here's the **db** service from your file, explained:

```yaml
services:
  db:
    image: postgres:16-alpine          # ① which image (Postgres v16, "alpine" = tiny)
    container_name: aura-db             # ② a friendly name for the container
    restart: unless-stopped             # ③ auto-restart if it crashes / on reboot
    environment:                        # ④ settings passed INTO Postgres
      POSTGRES_USER: aura
      POSTGRES_PASSWORD: aura_dev_password
      POSTGRES_DB: aura_gem_erp
    ports:
      - "5433:5432"                     # ⑤ port mapping (see §6)
    volumes:
      - db_data:/var/lib/postgresql/data # ⑥ where data is stored permanently (see §7)
    healthcheck: ...                    # ⑦ how Docker knows Postgres is "ready"
```

1. **image** — the blueprint. `:16-alpine` is the *tag* (version). "Alpine" is a
   minimal Linux, so the download is small.
2. **container_name** — so you can say `aura-db` instead of a random ID.
3. **restart** — if your PC reboots or the container crashes, Docker brings it back.
4. **environment** — the username/password/database name Postgres is created with.
   These become your database login. (⚠️ these are dev defaults — change them for a
   real customer.)
5. **ports** — connects a port on *your computer* to a port *inside* the container.
6. **volumes** — the fridge. Your data lives here and survives container deletion.
7. **healthcheck** — a repeated test (`pg_isready`) so other services wait until the
   database is truly ready, not just started.

---

## 6. Ports — and the `5433` story you lived through

A container is sealed. To reach the database *inside* it, you open a door:

```
"5433:5432"
   │     └── port INSIDE the container (Postgres always listens on 5432)
   └──────── port on YOUR computer that forwards to it
```

So your app connects to **`localhost:5433`**, Docker forwards that to **5432 inside
`aura-db`**, and Postgres answers.

**Why 5433 and not the usual 5432?** Your Windows machine already had a *separately
installed* PostgreSQL sitting on 5432. Two programs can't share one port, so we moved
the container's door to **5433** to avoid the clash. That's why your
`api/.env` says:

```
DATABASE_URL="postgresql://aura:aura_dev_password@localhost:5433/aura_gem_erp?schema=public"
```

If you ever move this project to a machine **without** a local Postgres, you could
switch it back to `5432` — but 5433 works fine and avoids surprises.

---

## 7. Where your data actually lives (volumes)

This is the most important thing to understand so you **never lose data**.

- The container `aura-db` is disposable. If you delete and recreate it, the *container*
  is new — but your stones, users and sales are **not** inside the container.
- They're in a **named volume** called `gemerpsystem_db_data`, which Docker stores on
  your computer independently of the container.

That's why, earlier, when we **recreated** the db container to change its port, your
**3 stones were still there** — the container changed, the volume didn't.

**Rules of thumb:**

- Stopping or recreating the container → **data is safe** (it's in the volume).
- `docker compose down` → stops & removes containers, **keeps volumes** → data safe.
- `docker compose down -v` → the `-v` also **deletes volumes** → ⚠️ **data gone**.
  Never run `-v` unless you truly want to wipe the database.
- `docker volume ls` → lists your volumes (you'll see `gemerpsystem_db_data`).

---

## 8. The everyday commands you'll actually use

Run these from the **project root** (`Gem ERP System` folder). "compose" reads your
`docker-compose.yml` automatically.

| Command | What it does |
|---------|--------------|
| `docker compose up -d db` | Start **just the database**, in the background (`-d` = detached) |
| `docker compose up -d --build` | Build + start **everything** (production style) |
| `docker compose ps` | List your project's containers and their status/ports |
| `docker compose stop` | Stop containers (keep them, keep data) |
| `docker compose start` | Start previously-stopped containers again |
| `docker compose down` | Stop **and remove** containers (data in volumes stays) |
| `docker compose logs -f db` | Watch the database's live logs (`Ctrl+C` to exit) |
| `docker ps` | List **all** running containers on your machine |
| `docker volume ls` | List volumes (where data lives) |
| `docker compose restart db` | Restart just the database |

You will realistically use only the **first three** day to day.

---

## 9. The startup order (why things "don't come up")

AURA GEM ERP has **three layers**, and each needs the one before it. Most "Something
went wrong" screens are just a missing layer:

```
1. Docker Desktop   ──►  hosts the database        (whale icon running)
2. Database (db)    ──►  docker compose up -d db    (port 5433, healthy)
3. API backend      ──►  npm run start:dev  (in api\)   → port 4000
4. Web frontend     ──►  npm run dev        (in web\)   → port 3000
```

**How to read an error and know which layer is missing:**

| Symptom | Missing layer | Fix |
|---------|--------------|-----|
| `P1001: Can't reach database server at localhost:5433` | 1 or 2 (Docker/db down) | Start Docker Desktop, then `docker compose up -d db` |
| Dashboard: *"Couldn't load… API didn't respond"* | 3 (API down) | `npm run start:dev` in `api\` |
| Browser can't open the site at all | 4 (web down) | `npm run dev` in `web\` |

---

## 10. Troubleshooting cheat-sheet (the exact issues you hit)

**"Authentication failed for user `aura`"**
A *different* PostgreSQL (your Windows-installed one on 5432) answered instead of the
container. Fixed by using **5433** for the container. If it recurs, check what owns a
port: the container's door should be 5433, owned by Docker's relay.

**"Can't reach database server at `localhost:5433` (P1001)"**
The container isn't running. Almost always because **Docker Desktop isn't started**.
Start the whale, wait ~30–60s, then `docker compose up -d db`.

**"Ports are not available / port is already allocated"**
Something else is using that port. Either stop that program, or change the left-hand
number in `ports: "5433:5432"` to a free port (and update `DATABASE_URL` to match).

**The container says `unhealthy` or keeps restarting**
Check its logs: `docker compose logs db`. Usually a wrong password/volume left over
from an earlier setup.

**"I think I lost my data"**
You almost certainly didn't — it's in the `gemerpsystem_db_data` volume. Run
`docker volume ls` to confirm it still exists. Data is only truly deleted by
`docker compose down -v` or manually removing the volume.

---

## 11. Do you *need* Docker?

**For the database: it's the easiest option**, but not the only one. Alternatives:

- **Install PostgreSQL directly** on Windows and point `DATABASE_URL` at it (port 5432).
  This is what your machine *already* has — but then you manage versions, users and
  backups yourself. Docker keeps it clean and disposable.
- **Use a cloud database** (e.g. Supabase, AWS RDS, Neon) — no Docker at all; just set
  `DATABASE_URL` to the cloud connection string. Good for production if you don't want
  to run your own server.

**For production / selling to customers: Docker is strongly recommended**, because
`docker compose up -d --build` installs and wires the *entire* system on any server in
one command. Without it, each customer's server would need manual installation of
Postgres + Node + nginx and careful configuration — error-prone and slow.

---

## 12. Deploying to a customer with Docker (the payoff)

On the customer's server (Linux is typical, cheapest on any cloud):

1. Install **Docker** (one-time, one command on Linux).
2. Copy the project files to the server.
3. Create a `.env` with that customer's settings (company name, owner login, strong
   `POSTGRES_PASSWORD`, JWT secrets — see `api/.env.example`).
4. Run:
   ```bash
   docker compose up -d --build
   ```
5. Open `http://the-server-address`. Done — database, backend, frontend and nginx are
   all running, and they restart automatically if the server reboots
   (`restart: unless-stopped`).

That's the whole reason Docker is in this project: **repeatable, one-command
deployment for every gem company you sell to.**

---

## 13. Mini-glossary

- **Docker** — tool for packaging and running software in isolated containers.
- **Image** — frozen template of software + setup (e.g. `postgres:16-alpine`).
- **Container** — a running instance of an image.
- **Volume** — persistent storage that outlives containers (your data).
- **Docker Hub** — public library of images Docker downloads from.
- **Docker Desktop** — the Windows/Mac app that runs the Docker engine.
- **Docker Engine** — the background service that runs containers.
- **Docker Compose** — runs multiple containers from one `docker-compose.yml`.
- **Port mapping** (`5433:5432`) — connects a port on your PC to one inside a container.
- **Reverse proxy (nginx)** — the front door that routes web traffic to the right service.
- **Tag** (`:16-alpine`) — the version label on an image.
- **Detached (`-d`)** — run in the background instead of filling your terminal.

---

### One-paragraph summary

Docker packages software into standard **containers** so it runs identically
everywhere. In AURA GEM ERP you use it in development to run **PostgreSQL** (the `db`
container on port **5433**, with your data safe in a **volume**), started with
`docker compose up -d db` — and in production to run the **whole system** (db + api +
web + nginx) with a single `docker compose up -d --build`. Always start **Docker
Desktop** first; most errors are simply a layer of the stack (Docker → db → api → web)
not yet running.
