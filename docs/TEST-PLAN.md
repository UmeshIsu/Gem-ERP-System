# AURA GEM ERP — Full Build & Test Plan (A–Z Acceptance Testing)

> A complete, click-by-click plan to build the project and verify **every feature**,
> following one gemstone from **login → purchase → processing → certification →
> export → reports**. Tick each ☐ as you go. Nothing here needs coding — it's all
> done in the browser and two terminals.

**How to use this:** Do the parts **in order** — later tests depend on data created
by earlier ones. Each test has **Steps**, the **Expected result**, and a checkbox.
If something fails, note it and see *Appendix B — Troubleshooting*.

**Roughly how long:** a thorough first pass is ~60–90 minutes.

---

# PART 1 — BUILD & START THE PROJECT

## 1.1 Prerequisites (one-time check)
- ☐ **Docker Desktop** is installed and the whale icon is running.
- ☐ **Node.js 20+** installed (`node -v`).
- ☐ You have two terminals available (VS Code: `` Ctrl+` `` then the `+` button).

## 1.2 Verify it *builds* (compiles for production)
This proves the code is deployment-ready. From each folder:

| ☐ | Where | Command | Expected |
|---|-------|---------|----------|
| ☐ | `api` | `npm run build` | Ends with no errors; a `dist` folder appears |
| ☐ | `web` | `npm run build` | "✓ Compiled successfully", lists 16 routes |

*(If a build fails, stop and fix that first — don't test a broken build.)*

## 1.3 Start the 4 layers (in this exact order)

| ☐ | # | Where | Command | Wait until you see |
|---|---|-------|---------|--------------------|
| ☐ | 1 | — | Launch **Docker Desktop** | whale icon steady |
| ☐ | 2 | project root | `docker compose up -d db` | returns to prompt |
| ☐ | 3 | `api` | `npm run start:dev` | `AURA GEM ERP API running on http://localhost:4000` |
| ☐ | 4 | `web` | `npm run dev` | `Local: http://localhost:3000` |

Keep terminals 3 and 4 open the whole time.

## 1.4 Smoke test (everything is alive)
- ☐ Open **http://localhost:3000** — the **login page** loads (no error).
- ☐ The brand panel shows **"Abeywardhane Gems"** (proves API + DB are reachable).

✅ **Part 1 done** — the system builds and all layers are up.

---

# PART 2 — TEST DATA CHEAT SHEET

Use these exact values so your results match this guide. (You can use your own, but
keep them consistent.)

| Thing | Value to use |
|-------|--------------|
| Owner login | `owner@abeywardhanegems.lk` / `Abeywardhane@2026` |
| New gem type | **Tanzanite** (Species: Zoisite) |
| New location | **Deniyaya** |
| New seller | **K. Bandara** |
| New buyer | **Siam Gems Co.** — Thailand |
| **Main stone** (full lifecycle) | Blue Sapphire · Rough · **Workflow C (Geuda Heat Treatment)** · **25.5 ct** · Ratnapura · K. Bandara · **LKR 500,000** |
| **Split stone** | Blue Sapphire · Rough · Workflow C · **60 ct** · **LKR 1,200,000** |
| Gas heat | Gas Furnace 01 · 1750 °C · 6 h |
| Electric | 4 weeks planned |
| Cutting | after weight **18 ct** · cost **LKR 40,000** · cutter "S. Perera" |
| Certification | Lab **GRS** · cost **LKR 25,000** · number `GRS2026-TEST-01` |
| Export sale price (main stone) | **LKR 1,500,000** |

---

# PART 3 — A–Z FUNCTIONAL TESTS

## TC-01 · Authentication 🔐
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | On the login page, enter a **wrong** password, submit | Red error toast "Invalid credentials"; stays on login |
| ☐ | Enter the correct owner email + password, submit | Redirects to **Dashboard** |
| ☐ | Press **F5** to refresh | Stays logged in (session persists) |
| ☐ | Top-right avatar → **Sign out** | Confirmation dialog appears |
| ☐ | Confirm sign out | Returns to login page |
| ☐ | Log back in | Back on the Dashboard |

## TC-02 · Company Profile 🏢
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Settings** → **Company** tab | Shows "Abeywardhane Gems", owner "Abeywardhane" |
| ☐ | Change **Phone** to `+94 11 234 5678`, click **Save Changes** | Green "Company profile updated" toast |
| ☐ | Refresh the page | The phone value persists |

## TC-03 · Master Data ⚙️
Do these under **Settings**. Each entity behaves the same (add / edit / deactivate).

| ☐ | Step | Expected |
|---|------|----------|
| ☐ | **Gem Types** tab → **Add** → name "Tanzanite", species "Zoisite" → Save | Row appears, status **Active** |
| ☐ | Edit Tanzanite (pencil), change color hint, Save | Updated value shows |
| ☐ | Deactivate Tanzanite (power icon) | Status becomes **Inactive**, row dims |
| ☐ | **Purchase Locations** → Add "Deniyaya" | Appears in list |
| ☐ | **Sellers** → Add "K. Bandara" | Appears |
| ☐ | **Buyers** → Add "Siam Gems Co.", country "Thailand" | Appears |
| ☐ | **Machines** tab | Gas + Electric machines already seeded are listed |
| ☐ | **Laboratories** tab | GIA, GRS, Lotus, etc. listed |

## TC-04 · Users & Roles 👥
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Settings → **Users** | Shows only **Abeywardhane (Owner)** + **System Support (Super Admin)** |
| ☐ | **Add User** → name "Test Manager", email `manager@test.lk`, role **Manager**, password `Manager@2026` | Created, appears Active |
| ☐ | **Add User** → "Test Inventory", `inv@test.lk`, role **Inventory Officer**, `Invent@2026` | Created |
| ☐ | *(keep these — used in TC-21 for role testing)* | |

## TC-05 · Dashboard — baseline (empty) 📊
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Dashboard** | Loads with no error |
| ☐ | Look at KPI tiles | Mostly **zeros** / low numbers (no stones yet) |
| ☐ | Look at charts | Render empty or near-empty without crashing |

## TC-06 · Create the MAIN stone (full lifecycle) 💎
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Inventory** → **New Stone** | Form opens |
| ☐ | Fill: Gem Type **Blue Sapphire**, Kind **Rough**, Weight **25.5**, Location **Ratnapura**, Seller **K. Bandara**, Purchase date today, Price **500000** | Fields accept values |
| ☐ | Workflow: click **Workflow C — Geuda Heat Treatment** | Card highlights; optional-stage switches appear |
| ☐ | Leave **Split** switch **OFF** (we won't split this one); leave Crack Removal ON | Switches toggle |
| ☐ | Add 1–2 purchase photos (optional) | Thumbnails preview |
| ☐ | **Register Stone** | Success toast; redirects to the stone detail page |
| ☐ | Note the code (e.g. **G0001**) | Code shown top-left |
| ☐ | Look at **Workflow Timeline** | Purchase = **Completed**; Split = **Not Applicable**; others **Pending** |

## TC-07 · Drive the workflow inline (the key test) 🔄
All on the **stone detail page**, using the buttons under each pending stage.

| ☐ | Step | Expected |
|---|------|----------|
| ☐ | **Inspection** → **Complete** → add note "Clean, good potential" → Mark Complete | Inspection turns green; In-Progress ping moves to next stage |
| ☐ | **Crack Removal** → **Complete** (or **Mark N/A**) | Stage updates accordingly |
| ☐ | **Gas Heat** → **Record Gas Heat** → Machine "Gas Furnace 01", Temp 1750, Duration 6, Result "Colour improved" → Save | Gas Heat = Completed; a batch record is created |
| ☐ | **Electric Treatment** → **Start Electric** → 4 weeks → Start | Stage becomes In-Progress |
| ☐ | Same stage → **Complete Electric** → 100% → Complete | Electric = Completed |
| ☐ | **Cutting** → **Record Cutting** → cutter "S. Perera", after **18**, cost **40000** → Save | Loss % auto-calculates (~29%); Cutting = Completed; stone weight now 18 ct |
| ☐ | **Certification** → **Send to Lab** → Lab **GRS**, cost **25000** → Send | Certification In-Progress |
| ☐ | Same stage → **Mark Issued** → number `GRS2026-TEST-01` → Issue | Certification = Completed |
| ☐ | Scroll the **Records** and **History** tabs | Batch, cutting, cert records + full event history present |

## TC-08 · Financials on the stone 💰
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | On the stone, open **Financial Summary** (right column) | Purchase 500,000 + Heat + Cutting (40,000) + Certification (25,000) auto-listed |
| ☐ | Click **Add Expense** → category **Transport**, amount **15000** → Save | Appears under expenses; Total Investment increases |
| ☐ | Verify **Total Investment** | ≈ 500,000 + 40,000 + 25,000 + 15,000 = **580,000** (plus any heat cost) |

## TC-09 · Split a SECOND stone 🔨
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Inventory → New Stone → Blue Sapphire, 60 ct, LKR 1,200,000, **Workflow C**, **Split switch ON** → Register | New stone (e.g. G0002) created |
| ☐ | On its detail page → **Split Stone** | Split dialog opens |
| ☐ | Allocation **Automatic by weight**; child A weight **35**, child B weight **25** → **Split into 2 stones** | Success; shows G0002-A, G0002-B |
| ☐ | Verify parent G0002 | Status **Split**, archived, lineage banner lists children |
| ☐ | Open child **G0002-A** | Inherits purchase info; allocated cost ≈ 1,200,000 × 35/60 = **700,000** |
| ☐ | Open child **G0002-B** | Allocated cost ≈ **500,000** (A + B = parent cost exactly) |

## TC-10 · Heat Treatment module (multi-stone batch) 🔥
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Heat Treatment** → **Gas Batches** tab | Shows the batch auto-created in TC-07 |
| ☐ | **New Gas Batch** → pick machine, add **G0002-A** and **G0002-B** → Create | Batch created, status **Pending** |
| ☐ | **Start** the batch | Status **Running** |
| ☐ | **Finish** → enter a result per stone → Complete Batch | Status **Completed**; a notification appears |
| ☐ | **Electric Treatment** tab | Shows any electric runs with progress bars |

## TC-11 · Cutting & Certification modules (list views) ✂️🏅
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Cutting** | The cutting record from TC-07 is listed with loss % and cost |
| ☐ | Sidebar → **Certification** | The GRS certificate is listed as **Issued** |

## TC-12 · Financials module 🧾
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Financials** → **Stone Expenses** | All per-stone expenses listed (heat, cutting, cert, transport) |
| ☐ | Filter by category **Cutting** | Only cutting expenses show |
| ☐ | **Categories** tab → **New Category** → "Marketing" → Create | Appears in list |
| ☐ | **Company Overheads** tab → **Company Expense** → category "Salary Allocation", 80000 → Save | Appears |

## TC-13 · Export the MAIN stone 🌍
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Exports & Sales** → **New Shipment** → Buyer **Siam Gems Co.**, Country Thailand → Create | Opens the shipment detail page with a code (EXP-2026-001) |
| ☐ | **Add Stone** → select your main stone **G0001**, sale price **1500000** → Add | Stone appears; Total Value = 1,500,000 |
| ☐ | Attach a document (any file), set a tracking number | Document + tracking saved |
| ☐ | **Mark as Shipped** → confirm | Status **Shipped**; a notification appears |
| ☐ | Open G0001 again | Status **Exported**; sale + profit shown in Financial Summary |
| ☐ | Verify profit | Net Profit ≈ 1,500,000 − ~580,000 = **~920,000**; ROI % shown |

## TC-14 · Local sale + the FREEZE guards 🔒
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Exports → **Local Sale** → pick **G0002-A**, price **900000** → Record Sale | Success toast with net profit; G0002-A becomes **Sold Locally** |
| ☐ | Open the sold **G0001** → try **Edit** (pencil / update) | **Blocked** — "This stone has been sold — its details are frozen…" |
| ☐ | *(This confirms the sold-stone edit guard works.)* | |

## TC-15 · Reports 📈 (now there's real data)
For each report: open it, check the numbers look right, then export.

| ☐ | Report | Check |
|---|--------|-------|
| ☐ | **Income Statement** | Revenue ≈ 2,400,000 (1.5M + 0.9M); net profit positive |
| ☐ | **Profit Report** | Lists both sold stones with ROI |
| ☐ | **Inventory Report** | Lists remaining in-stock stones + values |
| ☐ | **Purchase Report** | Lists your purchases for the month |
| ☐ | **Treatment Report** | Lists the gas/electric records |
| ☐ | **Export Report** | Lists the Thailand shipment |
| ☐ | **Cash Flow** | Inflows (sales) − outflows (purchases/expenses) |
| ☐ | **Gem Type** / **Location** reports | Grouped summaries |
| ☐ | On any report → **PDF** | A branded PDF downloads and opens |
| ☐ | → **Excel** | An .xlsx downloads and opens |
| ☐ | → **CSV** | A .csv downloads |
| ☐ | → **Print** | Print preview looks clean (no sidebar) |

## TC-16 · Dashboard — populated 📊
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Go to **Dashboard** | KPIs now show real values (inventory value, monthly sales, profit) |
| ☐ | Charts | Revenue/profit trend, inventory donut, location bars all render with data |
| ☐ | Recent Purchases / Latest Exports | Show your stones and the Thailand shipment |

## TC-17 · Notifications 🔔
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Click the **bell** icon (top bar) | Dropdown lists events (treatment completed, shipment shipped) |
| ☐ | Click a notification with a link | Navigates to that record |
| ☐ | **Mark all read** | Unread badge clears |

## TC-18 · Audit Logs 🛡️
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sidebar → **Audit Logs** | Long list of every action (create stone, split, sale, etc.) |
| ☐ | Click **View** on a change row | Shows **Before / After** JSON |
| ☐ | Filter by entity **Stone** | Only stone actions show |
| ☐ | Confirm the actor + timestamp + IP columns are populated | Present |

## TC-19 · Global Search & Filters 🔎
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Top-bar search → type `G0001` → Enter | Inventory filtered to that stone |
| ☐ | Search a certificate number `GRS2026` | Finds the stone |
| ☐ | Inventory → **Filters** → set a status / gem type / weight range | List narrows correctly |
| ☐ | Toggle **Include archived** | Sold/split stones appear |

## TC-20 · Look & feel / states 🎨
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Top bar → **theme toggle** (moon/sun) | Whole app switches dark/light cleanly; refresh keeps it |
| ☐ | Open an empty list (e.g. a filtered view with no results) | Nice **empty state** with icon, not a blank screen |
| ☐ | Reload a heavy page | **Skeleton shimmer** while loading |
| ☐ | Visit a bad URL like `/xyz` | Friendly **"Page not found"** with a button back |
| ☐ | Resize the window narrow / open on a tablet | Layout stays usable (tables scroll, cards stack) |

## TC-21 · Role-based access 👤 (log in as staff)
| ☐ | Step | Expected |
|---|------|----------|
| ☐ | Sign out; log in as **`inv@test.lk` / `Invent@2026`** (Inventory Officer) | Logs in |
| ☐ | Check the sidebar | **Settings** and **Audit Logs** are **hidden** (owner-only) |
| ☐ | Try to open `/settings` by typing the URL | Access is refused / limited |
| ☐ | Log in as **`manager@test.lk`** (Manager) | Sees more than inventory officer, but still no owner-only admin |
| ☐ | Log back in as **owner** | Full access restored |

---

# PART 4 — SIGN-OFF

The system passes acceptance when:
- ☐ All four layers build and start cleanly (Part 1).
- ☐ A stone goes **purchase → inspection → heat → electric → cutting → certification → export** with correct profit (TC-06–TC-15).
- ☐ Splitting, financials, reports (with PDF/Excel/CSV), dashboard, notifications and audit all work.
- ☐ Freeze guards and role restrictions behave (TC-14, TC-21).
- ☐ Dark mode, empty/loading/error states, search and filters all look right (TC-19–TC-20).

---

# PART 5 — RESET TO CLEAN STATE (before handover)

Your testing created demo stones, sales and staff users. Before giving the system
to Abeywardhane, wipe the test data so they start fresh:

| ☐ | Step |
|---|------|
| ☐ | Stop the API (Ctrl+C in its terminal) |
| ☐ | In `api`: `npx prisma migrate reset --force` |
| ☐ | This drops everything, re-applies migrations, and re-seeds a **clean** Abeywardhane Gems (owner + support only, empty inventory, master data intact) |
| ☐ | **Change the passwords** — set real `OWNER_PASSWORD` / `SUPPORT_PASSWORD` in `api/.env` first, then reset |
| ☐ | Restart the API |

⚠️ `migrate reset` erases ALL data — only run it while the data is still just test data.

---

# APPENDIX A — Quick command reference

```powershell
# Start (every session), from the right folders:
docker compose up -d db      # project root
npm run start:dev            # in api\
npm run dev                  # in web\

# Build check:
npm run build                # in api\  and in web\

# Reset DB to clean state (destroys data):
npx prisma migrate reset --force   # in api\
```

# APPENDIX B — If something fails

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Login page won't load | web not running | `npm run dev` in `web` |
| "Couldn't load…" / API errors | api not running | `npm run start:dev` in `api` |
| `P1001 ... 5433` | database/Docker down | Start Docker Desktop, `docker compose up -d db` |
| `P1001 ... 5432` | `.env` port wrong | set `DATABASE_URL` port to **5433** in `api/.env` |
| `EADDRINUSE :4000` | two APIs running | close the extra terminal / kill port 4000 |
| A button does nothing / 403 | role not allowed | log in as the **owner** |

See also: [DOCKER-GUIDE.md](DOCKER-GUIDE.md), [README.md](../README.md).
