# AURA GEM ERP — ER Diagram

```mermaid
erDiagram
    User ||--o{ RefreshToken : has
    User ||--o{ AuditLog : performs
    User ||--o{ Stone : creates
    User ||--o{ Notification : receives

    GemType ||--o{ Stone : classifies
    PurchaseLocation ||--o{ Stone : "purchased at"
    Seller ||--o{ Stone : "sold by"
    WorkflowTemplate ||--o{ WorkflowTemplateStage : contains
    WorkflowTemplate ||--o{ Stone : "applied to"

    Stone ||--o{ Stone : "parent / children"
    Stone ||--o{ StoneStage : "stage plan"
    Stone ||--o{ StoneEvent : timeline
    Stone ||--o{ StoneImage : images
    Stone ||--o{ StoneDocument : documents
    Stone ||--o{ StoneExpense : expenses
    Stone ||--o{ CuttingRecord : cuttings
    Stone ||--o{ Certification : certificates
    Stone ||--o{ TreatmentBatchStone : "in batches"
    Stone ||--o| ElectricTreatment : "electric run"
    Stone ||--o| SaleRecord : "sold as"
    Stone ||--o{ ExportItem : "shipped in"
    Stone ||--o| SplitEvent : "split via"

    SplitEvent ||--o{ Stone : produces

    Machine ||--o{ TreatmentBatch : runs
    TreatmentBatch ||--o{ TreatmentBatchStone : contains
    TreatmentBatch ||--o{ TreatmentImage : images
    ElectricTreatment ||--o{ ElectricProgressLog : "weekly logs"

    Laboratory ||--o{ Certification : issues

    ExpenseCategory ||--o{ StoneExpense : categorizes
    ExpenseCategory ||--o{ CompanyExpense : categorizes

    Buyer ||--o{ ExportShipment : receives
    Buyer ||--o{ SaleRecord : buys
    ExportShipment ||--o{ ExportItem : contains
    ExportShipment ||--o{ ExportDocument : documents

    Stone {
        uuid id PK
        string code UK "G0001, G0001-A"
        uuid parentId FK "self-relation"
        uuid gemTypeId FK
        uuid purchaseLocationId FK
        uuid sellerId FK
        uuid workflowTemplateId FK
        enum status "PURCHASED..ARCHIVED"
        enum stoneKind "ROUGH|GEUDA|SEMI_TREATED|CUT|FACETED"
        decimal weightCt
        string shape
        string dimensions
        string color
        string clarity
        string origin
        date purchaseDate
        decimal purchaseCost "allocated for children"
        decimal currentValue
        decimal salePrice
        boolean isArchived
        text notes
        string[] tags
    }

    StoneStage {
        uuid id PK
        uuid stoneId FK
        enum kind "PURCHASE..EXPORT_SALE"
        int sortOrder
        enum status "NOT_APPLICABLE|PENDING|IN_PROGRESS|COMPLETED|SKIPPED"
        datetime startedAt
        datetime completedAt
        string linkedEntity
        uuid linkedEntityId
    }

    TreatmentBatch {
        uuid id PK
        string batchCode UK
        enum type "GAS|ELECTRIC"
        uuid machineId FK
        uuid operatorId FK
        datetime startAt
        datetime expectedEndAt
        datetime actualEndAt
        int temperatureC
        int durationHours
        enum status "PENDING|RUNNING|COMPLETED|FAILED"
        text remarks
    }

    ElectricTreatment {
        uuid id PK
        uuid stoneId FK UK
        int plannedWeeks
        int completionPct
        date estimatedFinish
        enum status
    }

    CuttingRecord {
        uuid id PK
        uuid stoneId FK
        date cuttingDate
        string cutterName
        decimal weightBeforeCt
        decimal weightAfterCt
        decimal lossPct
        decimal cost
    }

    Certification {
        uuid id PK
        uuid stoneId FK
        uuid laboratoryId FK
        string certificateNumber UK
        date issueDate
        string pdfUrl
        enum status "PENDING|SENT|ISSUED|REJECTED"
    }

    StoneExpense {
        uuid id PK
        uuid stoneId FK
        uuid categoryId FK
        decimal amount
        date incurredAt
        text note
    }

    ExportShipment {
        uuid id PK
        string shipmentCode UK
        uuid buyerId FK
        string country
        date exportDate
        string invoiceNumber
        string courier
        string trackingNumber
        decimal exportValue
        enum status "DRAFT|PENDING|SHIPPED|DELIVERED|CANCELLED"
    }

    SaleRecord {
        uuid id PK
        uuid stoneId FK UK
        uuid buyerId FK
        enum channel "EXPORT|LOCAL"
        date saleDate
        decimal salePrice
        decimal grossProfit
        decimal netProfit
        decimal profitPct
        decimal roi
    }

    AuditLog {
        uuid id PK
        uuid userId FK
        string action
        string entity
        string entityId
        jsonb before
        jsonb after
        string ip
        string userAgent
        datetime createdAt
    }
```

**Conventions**

- All PKs are UUID v4; all money `Decimal(14,2)`; all carat weights `Decimal(10,3)`.
- Soft archival only (`isArchived` / status) — **no destructive deletes** on domain entities.
- `StoneEvent` (timeline) and `AuditLog` are append-only.
- `StoneImage.stageKind` tags photos to a lifecycle stage (e.g. `BEFORE_HEAT`, `AFTER_HEAT`, `BEFORE_CUT`, `AFTER_CUT`, `CERTIFICATION`, `EXPORT`).
