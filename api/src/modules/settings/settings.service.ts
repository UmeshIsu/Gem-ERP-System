import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type MasterEntity = 'gemType' | 'purchaseLocation' | 'seller' | 'buyer' | 'machine' | 'laboratory';

const ENTITY_LABEL: Record<MasterEntity, string> = {
  gemType: 'GemType',
  purchaseLocation: 'PurchaseLocation',
  seller: 'Seller',
  buyer: 'Buyer',
  machine: 'Machine',
  laboratory: 'Laboratory',
};

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private repo(entity: MasterEntity) {
    const repos = {
      gemType: this.prisma.gemType,
      purchaseLocation: this.prisma.purchaseLocation,
      seller: this.prisma.seller,
      buyer: this.prisma.buyer,
      machine: this.prisma.machine,
      laboratory: this.prisma.laboratory,
    } as const;
    return repos[entity] as any;
  }

  list(entity: MasterEntity, includeInactive = false) {
    return this.repo(entity).findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(entity: MasterEntity, data: Record<string, unknown>, userId: string) {
    const row = await this.repo(entity).create({ data });
    await this.audit.log({ userId, action: 'CREATE', entity: ENTITY_LABEL[entity], entityId: row.id, after: row });
    return row;
  }

  async update(entity: MasterEntity, id: string, data: Record<string, unknown>, userId: string) {
    const before = await this.repo(entity).findUniqueOrThrow({ where: { id } });
    const row = await this.repo(entity).update({ where: { id }, data });
    await this.audit.log({ userId, action: 'UPDATE', entity: ENTITY_LABEL[entity], entityId: id, before, after: row });
    return row;
  }

  /** Master data is deactivated, never deleted — historical stones reference it. */
  async deactivate(entity: MasterEntity, id: string, userId: string) {
    const row = await this.repo(entity).update({ where: { id }, data: { isActive: false } });
    await this.audit.log({ userId, action: 'DEACTIVATE', entity: ENTITY_LABEL[entity], entityId: id, after: row });
    return row;
  }

  /** Bring a previously deactivated record back into active use. */
  async reactivate(entity: MasterEntity, id: string, userId: string) {
    const row = await this.repo(entity).update({ where: { id }, data: { isActive: true } });
    await this.audit.log({ userId, action: 'REACTIVATE', entity: ENTITY_LABEL[entity], entityId: id, after: row });
    return row;
  }

  /** Full-database JSON snapshot for backup. Restore is an operational task (pg_restore / prisma db push + import). */
  async backup() {
    const [
      users, gemTypes, purchaseLocations, sellers, buyers, machines, laboratories,
      expenseCategories, workflowTemplates, workflowTemplateStages, stones, stoneStages,
      stoneEvents, stoneImages, stoneDocuments, splitEvents, treatmentBatches,
      treatmentBatchStones, electricTreatments, electricProgressLogs, cuttingRecords,
      certifications, stoneExpenses, companyExpenses, exportShipments, exportItems,
      exportDocuments, saleRecords, notifications, counters,
    ] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, phone: true, isActive: true, createdAt: true } }),
      this.prisma.gemType.findMany(),
      this.prisma.purchaseLocation.findMany(),
      this.prisma.seller.findMany(),
      this.prisma.buyer.findMany(),
      this.prisma.machine.findMany(),
      this.prisma.laboratory.findMany(),
      this.prisma.expenseCategory.findMany(),
      this.prisma.workflowTemplate.findMany(),
      this.prisma.workflowTemplateStage.findMany(),
      this.prisma.stone.findMany(),
      this.prisma.stoneStage.findMany(),
      this.prisma.stoneEvent.findMany(),
      this.prisma.stoneImage.findMany(),
      this.prisma.stoneDocument.findMany(),
      this.prisma.splitEvent.findMany(),
      this.prisma.treatmentBatch.findMany(),
      this.prisma.treatmentBatchStone.findMany(),
      this.prisma.electricTreatment.findMany(),
      this.prisma.electricProgressLog.findMany(),
      this.prisma.cuttingRecord.findMany(),
      this.prisma.certification.findMany(),
      this.prisma.stoneExpense.findMany(),
      this.prisma.companyExpense.findMany(),
      this.prisma.exportShipment.findMany(),
      this.prisma.exportItem.findMany(),
      this.prisma.exportDocument.findMany(),
      this.prisma.saleRecord.findMany(),
      this.prisma.notification.findMany(),
      this.prisma.counter.findMany(),
    ]);

    return {
      meta: { app: 'AURA GEM ERP', version: 1, exportedAt: new Date().toISOString() },
      data: {
        users, gemTypes, purchaseLocations, sellers, buyers, machines, laboratories,
        expenseCategories, workflowTemplates, workflowTemplateStages, stones, stoneStages,
        stoneEvents, stoneImages, stoneDocuments, splitEvents, treatmentBatches,
        treatmentBatchStones, electricTreatments, electricProgressLogs, cuttingRecords,
        certifications, stoneExpenses, companyExpenses, exportShipments, exportItems,
        exportDocuments, saleRecords, notifications, counters,
      },
    };
  }

  validateEntity(entity: string): MasterEntity {
    if (!(entity in ENTITY_LABEL)) {
      throw new BadRequestException(
        `Unknown master data entity "${entity}". Valid: ${Object.keys(ENTITY_LABEL).join(', ')}`,
      );
    }
    return entity as MasterEntity;
  }
}
