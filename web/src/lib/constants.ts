export const STONE_STATUSES = [
  'PURCHASED',
  'INSPECTION',
  'CRACK_REMOVAL',
  'SPLITTING',
  'SPLIT',
  'HEAT_TREATMENT',
  'ELECTRIC_TREATMENT',
  'CUTTING',
  'POLISHING',
  'CERTIFICATION',
  'READY_FOR_EXPORT',
  'EXPORTED',
  'SOLD_LOCALLY',
  'ARCHIVED',
] as const;

export type StoneStatus = (typeof STONE_STATUSES)[number];

export const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'outline'> = {
  PURCHASED: 'info',
  INSPECTION: 'secondary',
  CRACK_REMOVAL: 'secondary',
  SPLITTING: 'warning',
  SPLIT: 'outline',
  HEAT_TREATMENT: 'warning',
  ELECTRIC_TREATMENT: 'warning',
  CUTTING: 'secondary',
  POLISHING: 'secondary',
  CERTIFICATION: 'info',
  READY_FOR_EXPORT: 'success',
  EXPORTED: 'success',
  SOLD_LOCALLY: 'success',
  ARCHIVED: 'outline',
  // batches
  PENDING: 'warning',
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'destructive',
  // certs
  SENT_TO_LAB: 'warning',
  ISSUED: 'success',
  REJECTED: 'destructive',
  // shipments
  DRAFT: 'secondary',
  SHIPPED: 'success',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  PAUSED: 'warning',
};

export const STONE_KINDS = ['ROUGH', 'GEUDA', 'SEMI_TREATED', 'CUT', 'FACETED'] as const;

export const STAGE_KINDS = [
  'PURCHASE',
  'INSPECTION',
  'CRACK_REMOVAL',
  'SPLITTING',
  'GAS_HEAT',
  'ELECTRIC_TREATMENT',
  'CUTTING',
  'POLISHING',
  'CERTIFICATION',
  'EXPORT_SALE',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  PURCHASE: 'Purchase',
  INSPECTION: 'Inspection',
  CRACK_REMOVAL: 'Crack Removal',
  SPLITTING: 'Splitting',
  GAS_HEAT: 'Gas Heat Treatment',
  ELECTRIC_TREATMENT: 'Electric Treatment',
  CUTTING: 'Cutting',
  POLISHING: 'Polishing',
  CERTIFICATION: 'Certification',
  EXPORT_SALE: 'Export / Sale',
};

export const IMAGE_STAGES = [
  'PURCHASE',
  'INSPECTION',
  'BEFORE_HEAT',
  'AFTER_HEAT',
  'ELECTRIC_PROGRESS',
  'BEFORE_CUT',
  'AFTER_CUT',
  'CERTIFICATION',
  'EXPORT',
  'OTHER',
] as const;

export const ROLES = [
  'SUPER_ADMIN',
  'OWNER',
  'MANAGER',
  'FINANCE_OFFICER',
  'INVENTORY_OFFICER',
  'HEAT_OPERATOR',
  'VIEWER',
] as const;
