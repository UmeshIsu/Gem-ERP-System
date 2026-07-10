# AURA GEM ERP — User Flows & Workflow Engine

## 1. Master Lifecycle

```
Purchase
      │
      ▼
Inspection ──────────────► Export / Direct Sale (Workflow A/D)
      │
      ▼
Crack Removal (optional)
      │
      ▼
Split (optional) ─────────► child stones each continue independently
      │
      ▼
Gas Heat Treatment (optional)
      │
      ▼
Electric Treatment (optional, week-based)
      │
      ▼
Cutting (optional)
      │
      ▼
Certification (optional)
      │
      ▼
Export / Sold Locally
      │
      ▼
Archived (permanent record)
```

## 2. Seeded Workflow Templates

| Template | Stages |
|---|---|
| **A — Direct Sale / Export** | Purchase → Inspection → Certification (opt) → Export/Sale |
| **B — Rough Stone Processing** | Purchase → Crack Removal (opt) → Cutting → Certification → Export |
| **C — Geuda Heat Treatment** | Purchase → Crack Removal (opt) → Split (opt) → Gas Heat → Electric (opt) → Cutting → Certification → Export |
| **D — Already Cut Stone** | Purchase → Certification → Export |

Admins can create unlimited additional templates in Settings and toggle each stage required/optional. The template is copied to the stone at creation; the plan is then per-stone editable.

## 3. Key Flows

### 3.1 Register a purchase (Inventory Officer)
1. Inventory → *New Stone* → fill purchase form (gem type, weight, location, seller, price, images).
2. Choose workflow template (defaults from stone kind) and toggle optional stages, including **Will this stone be split?**
3. System assigns the next code (`G0042`), generates QR/barcode payloads, creates the stage plan, logs `STONE_CREATED`.

### 3.2 Split a stone (Manager / Inventory)
1. Stone detail → *Split Stone* → enter child weights (+ optional dimensions/notes).
2. Choose cost allocation: **Automatic by weight** or **Manual** (must total the parent cost).
3. Confirm — children `G0042-A…` created, parent archived as `SPLIT`, relationship shown forever on both timelines.

### 3.3 Gas heat batch (Heat Operator)
1. Treatments → *New Batch* → pick machine, temperature, duration, add stones from eligible inventory.
2. Start batch → stones' `GAS_HEAT` stage becomes `IN_PROGRESS`.
3. On completion record result per stone (before/after images, remarks) → stage `COMPLETED`, dashboard alert cleared.

### 3.4 Electric treatment (weeks)
Create run with planned weeks → add weekly progress logs (completion %, color improvement, photos) → system projects estimated finish and raises "Electric treatment due" notifications.

### 3.5 Export (Finance / Manager)
1. Exports → *New Shipment* → buyer, country, courier, invoice number.
2. Add ready stones with sale prices → system computes gross/net profit, ROI per stone.
3. Mark shipped → stones become `EXPORTED`, `SaleRecord`s created, revenue hits reports.

### 3.6 Reports (Finance)
Pick report + period + filters → view on screen → export **PDF / Excel / CSV** or print.

## 4. Timeline Rendering

The stone detail page shows every planned stage in order with one of:
- ✓ **Completed** (date, actor, linked record, photos)
- ● **In Progress**
- ○ **Pending**
- — **Not Applicable** (explicitly displayed, never hidden)
- ⤫ **Skipped** (with reason)

The timeline is generated from `StoneStage` + `StoneEvent` and is part of the permanent audit history.
