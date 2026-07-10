import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StageKind, StageStatus, StoneStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Maps an active stage to the stone's denormalized status. */
const STAGE_TO_STATUS: Record<StageKind, StoneStatus> = {
  PURCHASE: StoneStatus.PURCHASED,
  INSPECTION: StoneStatus.INSPECTION,
  CRACK_REMOVAL: StoneStatus.CRACK_REMOVAL,
  SPLITTING: StoneStatus.SPLITTING,
  GAS_HEAT: StoneStatus.HEAT_TREATMENT,
  ELECTRIC_TREATMENT: StoneStatus.ELECTRIC_TREATMENT,
  CUTTING: StoneStatus.CUTTING,
  POLISHING: StoneStatus.POLISHING,
  CERTIFICATION: StoneStatus.CERTIFICATION,
  EXPORT_SALE: StoneStatus.READY_FOR_EXPORT,
};

@Injectable()
export class WorkflowService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Templates ─────────────────────────────────────────────

  listTemplates() {
    return this.prisma.workflowTemplate.findMany({
      where: { isActive: true },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { code: 'asc' },
    });
  }

  async createTemplate(
    dto: { name: string; code: string; description?: string; stages: { kind: StageKind; isOptional: boolean }[] },
    actorId: string,
  ) {
    if (!dto.stages.some((s) => s.kind === StageKind.PURCHASE)) {
      throw new BadRequestException('Every workflow must begin with a PURCHASE stage');
    }
    const tpl = await this.prisma.workflowTemplate.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        stages: { create: dto.stages.map((s, i) => ({ kind: s.kind, isOptional: s.isOptional, sortOrder: i })) },
      },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'WorkflowTemplate', entityId: tpl.id, after: tpl });
    return tpl;
  }

  async updateTemplate(
    id: string,
    dto: { name?: string; description?: string; isActive?: boolean; stages?: { kind: StageKind; isOptional: boolean }[] },
    actorId: string,
  ) {
    const before = await this.prisma.workflowTemplate.findUniqueOrThrow({ where: { id }, include: { stages: true } });
    const tpl = await this.prisma.$transaction(async (tx) => {
      if (dto.stages) {
        await tx.workflowTemplateStage.deleteMany({ where: { templateId: id } });
        await tx.workflowTemplateStage.createMany({
          data: dto.stages.map((s, i) => ({ templateId: id, kind: s.kind, isOptional: s.isOptional, sortOrder: i })),
        });
      }
      return tx.workflowTemplate.update({
        where: { id },
        data: { name: dto.name, description: dto.description, isActive: dto.isActive },
        include: { stages: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    await this.audit.log({ userId: actorId, action: 'UPDATE', entity: 'WorkflowTemplate', entityId: id, before, after: tpl });
    return tpl;
  }

  // ── Per-stone plans ───────────────────────────────────────

  /**
   * Builds the per-stone stage plan from a template.
   * `skipStages` marks optional stages the owner opted out of as NOT_APPLICABLE
   * so the timeline always shows the full picture.
   */
  async buildStagePlan(
    tx: Prisma.TransactionClient,
    stoneId: string,
    templateId: string,
    skipStages: StageKind[] = [],
  ) {
    const tpl = await tx.workflowTemplate.findUnique({
      where: { id: templateId },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!tpl) throw new NotFoundException('Workflow template not found');

    await tx.stoneStage.createMany({
      data: tpl.stages.map((s, i) => ({
        stoneId,
        kind: s.kind,
        sortOrder: i,
        status:
          s.kind === StageKind.PURCHASE
            ? StageStatus.COMPLETED
            : skipStages.includes(s.kind)
              ? StageStatus.NOT_APPLICABLE
              : StageStatus.PENDING,
        completedAt: s.kind === StageKind.PURCHASE ? new Date() : null,
      })),
    });
  }

  /** Marks a stage IN_PROGRESS and syncs the stone status. Usable inside or outside a transaction. */
  async startStage(
    stoneId: string,
    kind: StageKind,
    userId: string,
    opts: { linkedEntity?: string; linkedEntityId?: string; tx?: Prisma.TransactionClient } = {},
  ) {
    const db = opts.tx ?? this.prisma;
    const stage = await db.stoneStage.findUnique({ where: { stoneId_kind: { stoneId, kind } } });
    if (!stage) throw new BadRequestException(`Stage ${kind} is not part of this stone's workflow`);
    if (stage.status === StageStatus.NOT_APPLICABLE) {
      throw new BadRequestException(`Stage ${kind} is marked Not Applicable for this stone`);
    }
    if (stage.status === StageStatus.COMPLETED) {
      throw new BadRequestException(`Stage ${kind} is already completed`);
    }

    await db.stoneStage.update({
      where: { id: stage.id },
      data: {
        status: StageStatus.IN_PROGRESS,
        startedAt: stage.startedAt ?? new Date(),
        linkedEntity: opts.linkedEntity ?? stage.linkedEntity,
        linkedEntityId: opts.linkedEntityId ?? stage.linkedEntityId,
      },
    });
    await db.stone.update({ where: { id: stoneId }, data: { status: STAGE_TO_STATUS[kind] } });
    await db.stoneEvent.create({
      data: { stoneId, userId, kind: 'STAGE_STARTED', stage: kind, title: `${this.label(kind)} started` },
    });
  }

  /** Completes a stage, advances the stone status to the next pending stage. */
  async completeStage(
    stoneId: string,
    kind: StageKind,
    userId: string,
    opts: { detail?: string; linkedEntity?: string; linkedEntityId?: string; nextStatus?: StoneStatus; tx?: Prisma.TransactionClient } = {},
  ) {
    const db = opts.tx ?? this.prisma;
    const stage = await db.stoneStage.findUnique({ where: { stoneId_kind: { stoneId, kind } } });
    if (!stage) throw new BadRequestException(`Stage ${kind} is not part of this stone's workflow`);

    await db.stoneStage.update({
      where: { id: stage.id },
      data: {
        status: StageStatus.COMPLETED,
        startedAt: stage.startedAt ?? new Date(),
        completedAt: new Date(),
        linkedEntity: opts.linkedEntity ?? stage.linkedEntity,
        linkedEntityId: opts.linkedEntityId ?? stage.linkedEntityId,
      },
    });
    await db.stoneEvent.create({
      data: {
        stoneId,
        userId,
        kind: 'STAGE_COMPLETED',
        stage: kind,
        title: `${this.label(kind)} completed`,
        detail: opts.detail,
      },
    });

    if (opts.nextStatus) {
      await db.stone.update({ where: { id: stoneId }, data: { status: opts.nextStatus } });
      return;
    }

    // Advance to the next actionable stage
    const next = await db.stoneStage.findFirst({
      where: { stoneId, status: { in: [StageStatus.PENDING, StageStatus.IN_PROGRESS] } },
      orderBy: { sortOrder: 'asc' },
    });
    if (next) {
      await db.stone.update({ where: { id: stoneId }, data: { status: STAGE_TO_STATUS[next.kind] } });
    }
  }

  async skipStage(stoneId: string, kind: StageKind, reason: string, userId: string) {
    const stage = await this.prisma.stoneStage.findUnique({ where: { stoneId_kind: { stoneId, kind } } });
    if (!stage) throw new BadRequestException(`Stage ${kind} is not part of this stone's workflow`);
    if (stage.status === StageStatus.COMPLETED) throw new BadRequestException('Cannot skip a completed stage');

    await this.prisma.stoneStage.update({
      where: { id: stage.id },
      data: { status: StageStatus.SKIPPED, skippedReason: reason },
    });
    await this.prisma.stoneEvent.create({
      data: { stoneId, userId, kind: 'STAGE_SKIPPED', stage: kind, title: `${this.label(kind)} skipped`, detail: reason },
    });
    await this.audit.log({ userId, action: 'STAGE_SKIPPED', entity: 'Stone', entityId: stoneId, after: { stage: kind, reason } });
    return this.getPlan(stoneId);
  }

  /** Toggle an optional stage between PENDING and NOT_APPLICABLE. */
  async setStageApplicability(stoneId: string, kind: StageKind, applicable: boolean, userId: string) {
    const stage = await this.prisma.stoneStage.findUnique({ where: { stoneId_kind: { stoneId, kind } } });
    if (!stage) throw new BadRequestException(`Stage ${kind} is not part of this stone's workflow`);
    if ([StageStatus.COMPLETED, StageStatus.IN_PROGRESS].includes(stage.status as any)) {
      throw new BadRequestException('Cannot change applicability of a started stage');
    }
    await this.prisma.stoneStage.update({
      where: { id: stage.id },
      data: { status: applicable ? StageStatus.PENDING : StageStatus.NOT_APPLICABLE },
    });
    await this.audit.log({
      userId,
      action: 'STAGE_APPLICABILITY',
      entity: 'Stone',
      entityId: stoneId,
      after: { stage: kind, applicable },
    });
    return this.getPlan(stoneId);
  }

  /**
   * Directly complete a "simple" stage that has no dedicated domain record
   * (Inspection, Crack Removal, Polishing). The heavier stages — gas heat,
   * cutting, certification, export — are completed through their own modules
   * so a proper record is created.
   */
  async completeSimpleStage(stoneId: string, kind: StageKind, note: string | undefined, userId: string) {
    const SIMPLE: StageKind[] = [StageKind.INSPECTION, StageKind.CRACK_REMOVAL, StageKind.POLISHING];
    if (!SIMPLE.includes(kind)) {
      throw new BadRequestException(
        `${this.label(kind)} is completed from its own module (Heat Treatment, Cutting, Certification or Exports), not directly.`,
      );
    }
    const stage = await this.prisma.stoneStage.findUnique({ where: { stoneId_kind: { stoneId, kind } } });
    if (!stage) throw new BadRequestException(`Stage ${kind} is not part of this stone's workflow`);
    if (stage.status === StageStatus.COMPLETED) throw new BadRequestException(`${this.label(kind)} is already completed`);
    if (stage.status === StageStatus.NOT_APPLICABLE) {
      throw new BadRequestException(`${this.label(kind)} is marked Not Applicable for this stone`);
    }

    await this.completeStage(stoneId, kind, userId, { detail: note });
    await this.audit.log({ userId, action: 'STAGE_COMPLETED', entity: 'Stone', entityId: stoneId, after: { stage: kind, note } });
    return this.getPlan(stoneId);
  }

  getPlan(stoneId: string) {
    return this.prisma.stoneStage.findMany({ where: { stoneId }, orderBy: { sortOrder: 'asc' } });
  }

  label(kind: StageKind): string {
    const labels: Record<StageKind, string> = {
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
    return labels[kind];
  }
}
