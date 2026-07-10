import { BadRequestException, Injectable } from '@nestjs/common';
import { BatchStatus, ElectricStatus, NotificationKind, Prisma, StageKind, TreatmentType } from '@prisma/client';
import { addWeeks } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WorkflowService } from '../workflow/workflow.service';
import { paginate } from '../../common/dto/pagination.dto';
import {
  BatchQueryDto,
  CompleteBatchDto,
  CreateBatchDto,
  CreateElectricDto,
  ElectricProgressDto,
  UpdateBatchDto,
  UpdateElectricDto,
} from './dto/treatment.dto';

const batchInclude = {
  machine: true,
  operator: { select: { id: true, fullName: true } },
  stones: { include: { stone: { select: { id: true, code: true, weightCt: true, status: true, gemType: { select: { name: true } } } } } },
  images: true,
} satisfies Prisma.TreatmentBatchInclude;

@Injectable()
export class TreatmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private workflow: WorkflowService,
  ) {}

  private async nextBatchCode(type: TreatmentType): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === TreatmentType.GAS ? 'HT' : 'ET';
    const n = await this.prisma.nextCounter(`batch-${year}`);
    return `${prefix}-${year}-${String(n).padStart(3, '0')}`;
  }

  // ── Gas / batch treatments ────────────────────────────────

  async listBatches(q: BatchQueryDto) {
    const where: Prisma.TreatmentBatchWhereInput = {
      ...(q.status && { status: q.status }),
      ...(q.type && { type: q.type }),
      ...(q.machineId && { machineId: q.machineId }),
      ...(q.search && {
        OR: [
          { batchCode: { contains: q.search, mode: 'insensitive' as const } },
          { stones: { some: { stone: { code: { contains: q.search, mode: 'insensitive' as const } } } } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.treatmentBatch.findMany({
        where,
        include: batchInclude,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.treatmentBatch.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  getBatch(id: string) {
    return this.prisma.treatmentBatch.findUniqueOrThrow({ where: { id }, include: batchInclude });
  }

  async createBatch(dto: CreateBatchDto, userId: string) {
    const stones = await this.prisma.stone.findMany({ where: { id: { in: dto.stoneIds } } });
    if (stones.length !== dto.stoneIds.length) throw new BadRequestException('One or more stones not found');

    const batchCode = await this.nextBatchCode(dto.type);
    const batch = await this.prisma.treatmentBatch.create({
      data: {
        batchCode,
        type: dto.type,
        machineId: dto.machineId,
        operatorId: dto.operatorId ?? userId,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        expectedEndAt: dto.expectedEndAt ? new Date(dto.expectedEndAt) : null,
        temperatureC: dto.temperatureC,
        durationHours: dto.durationHours,
        remarks: dto.remarks,
        stones: { create: stones.map((s) => ({ stoneId: s.id, weightBeforeCt: s.weightCt })) },
      },
      include: batchInclude,
    });

    await this.audit.log({ userId, action: 'CREATE', entity: 'TreatmentBatch', entityId: batch.id, after: batch });
    return batch;
  }

  async updateBatch(id: string, dto: UpdateBatchDto, userId: string) {
    const before = await this.prisma.treatmentBatch.findUniqueOrThrow({ where: { id } });
    if (before.status === BatchStatus.COMPLETED) throw new BadRequestException('A completed batch cannot be edited');
    const batch = await this.prisma.treatmentBatch.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        expectedEndAt: dto.expectedEndAt ? new Date(dto.expectedEndAt) : undefined,
      },
      include: batchInclude,
    });
    await this.audit.log({ userId, action: 'UPDATE', entity: 'TreatmentBatch', entityId: id, before, after: batch });
    return batch;
  }

  async startBatch(id: string, userId: string) {
    const batch = await this.prisma.treatmentBatch.findUniqueOrThrow({ where: { id }, include: { stones: true } });
    if (batch.status !== BatchStatus.PENDING) throw new BadRequestException('Only a pending batch can be started');

    await this.prisma.$transaction(async (tx) => {
      await tx.treatmentBatch.update({
        where: { id },
        data: { status: BatchStatus.RUNNING, startAt: batch.startAt ?? new Date() },
      });
      for (const link of batch.stones) {
        await this.workflow.startStage(link.stoneId, StageKind.GAS_HEAT, userId, {
          linkedEntity: 'TreatmentBatch',
          linkedEntityId: id,
          tx,
        });
      }
    });

    await this.audit.log({ userId, action: 'START', entity: 'TreatmentBatch', entityId: id });
    return this.getBatch(id);
  }

  async completeBatch(id: string, dto: CompleteBatchDto, userId: string) {
    if (![BatchStatus.COMPLETED, BatchStatus.FAILED].includes(dto.status as any)) {
      throw new BadRequestException('Status must be COMPLETED or FAILED');
    }
    const batch = await this.prisma.treatmentBatch.findUniqueOrThrow({ where: { id }, include: { stones: true } });
    if (batch.status !== BatchStatus.RUNNING && batch.status !== BatchStatus.PENDING) {
      throw new BadRequestException('Batch is already finished');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.treatmentBatch.update({
        where: { id },
        data: { status: dto.status, actualEndAt: new Date(), remarks: dto.remarks ?? batch.remarks },
      });

      for (const link of batch.stones) {
        const result = dto.results?.find((r) => r.stoneId === link.stoneId);
        if (result) {
          await tx.treatmentBatchStone.update({
            where: { id: link.id },
            data: { result: result.result, weightAfterCt: result.weightAfterCt },
          });
          if (result.weightAfterCt) {
            await tx.stone.update({ where: { id: link.stoneId }, data: { weightCt: result.weightAfterCt } });
          }
        }
        if (dto.status === BatchStatus.COMPLETED) {
          await this.workflow.completeStage(link.stoneId, StageKind.GAS_HEAT, userId, {
            detail: `Batch ${batch.batchCode} completed${result?.result ? ` — ${result.result}` : ''}`,
            linkedEntity: 'TreatmentBatch',
            linkedEntityId: id,
            tx,
          });
        } else {
          await tx.stoneEvent.create({
            data: {
              stoneId: link.stoneId,
              userId,
              kind: 'TREATMENT_FAILED',
              stage: StageKind.GAS_HEAT,
              title: `Batch ${batch.batchCode} failed`,
              detail: dto.remarks,
            },
          });
        }
      }

      await tx.notification.create({
        data: {
          kind: NotificationKind.TREATMENT_FINISHED,
          title: `Batch ${batch.batchCode} ${dto.status === BatchStatus.COMPLETED ? 'completed' : 'failed'}`,
          body: `${batch.stones.length} stone(s) processed`,
          link: `/treatments/${id}`,
        },
      });
    });

    await this.audit.log({ userId, action: 'COMPLETE', entity: 'TreatmentBatch', entityId: id, after: { status: dto.status } });
    return this.getBatch(id);
  }

  async addBatchImage(id: string, url: string, caption: string | undefined, userId: string) {
    const image = await this.prisma.treatmentImage.create({ data: { batchId: id, url, caption } });
    await this.audit.log({ userId, action: 'ADD_IMAGE', entity: 'TreatmentBatch', entityId: id, after: image });
    return image;
  }

  // ── Electric treatments (week-based) ─────────────────────

  async listElectric(q: BatchQueryDto) {
    const where: Prisma.ElectricTreatmentWhereInput = q.search
      ? { stone: { code: { contains: q.search, mode: 'insensitive' } } }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.electricTreatment.findMany({
        where,
        include: {
          stone: { select: { id: true, code: true, weightCt: true, gemType: { select: { name: true } } } },
          logs: { orderBy: { weekNumber: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.electricTreatment.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async createElectric(dto: CreateElectricDto, userId: string) {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.electricTreatment.create({
        data: {
          stoneId: dto.stoneId,
          plannedWeeks: dto.plannedWeeks,
          startDate,
          estimatedFinish: addWeeks(startDate, dto.plannedWeeks),
          notes: dto.notes,
        },
      });
      await this.workflow.startStage(dto.stoneId, StageKind.ELECTRIC_TREATMENT, userId, {
        linkedEntity: 'ElectricTreatment',
        linkedEntityId: created.id,
        tx,
      });
      return created;
    });
    await this.audit.log({ userId, action: 'CREATE', entity: 'ElectricTreatment', entityId: run.id, after: run });
    return run;
  }

  async addElectricProgress(id: string, dto: ElectricProgressDto, userId: string) {
    const run = await this.prisma.electricTreatment.findUniqueOrThrow({ where: { id }, include: { stone: true } });
    if (run.status !== ElectricStatus.RUNNING && run.status !== ElectricStatus.PAUSED) {
      throw new BadRequestException('This electric treatment is already finished');
    }

    const log = await this.prisma.$transaction(async (tx) => {
      const created = await tx.electricProgressLog.upsert({
        where: { treatmentId_weekNumber: { treatmentId: id, weekNumber: dto.weekNumber } },
        update: { completionPct: dto.completionPct, colorImprovement: dto.colorImprovement, imageUrl: dto.imageUrl, notes: dto.notes },
        create: { treatmentId: id, ...dto },
      });
      await tx.electricTreatment.update({ where: { id }, data: { completionPct: dto.completionPct } });
      await tx.stoneEvent.create({
        data: {
          stoneId: run.stoneId,
          userId,
          kind: 'ELECTRIC_PROGRESS',
          stage: StageKind.ELECTRIC_TREATMENT,
          title: `Electric treatment — week ${dto.weekNumber} (${dto.completionPct}%)`,
          detail: dto.colorImprovement,
        },
      });
      return created;
    });

    await this.audit.log({ userId, action: 'PROGRESS', entity: 'ElectricTreatment', entityId: id, after: log });
    return log;
  }

  async updateElectric(id: string, dto: UpdateElectricDto, userId: string) {
    const before = await this.prisma.electricTreatment.findUniqueOrThrow({ where: { id } });

    const run = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.electricTreatment.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.plannedWeeks && { estimatedFinish: addWeeks(before.startDate, dto.plannedWeeks) }),
        },
      });
      if (dto.status === ElectricStatus.COMPLETED) {
        await tx.electricTreatment.update({ where: { id }, data: { completionPct: 100 } });
        await this.workflow.completeStage(before.stoneId, StageKind.ELECTRIC_TREATMENT, userId, {
          detail: 'Electric treatment completed',
          linkedEntity: 'ElectricTreatment',
          linkedEntityId: id,
          tx,
        });
        await tx.notification.create({
          data: {
            kind: NotificationKind.TREATMENT_FINISHED,
            title: 'Electric treatment completed',
            body: `Stone treatment run finished after ${updated.completionPct}% progress`,
            link: `/treatments/electric`,
          },
        });
      }
      return updated;
    });

    await this.audit.log({ userId, action: 'UPDATE', entity: 'ElectricTreatment', entityId: id, before, after: run });
    return run;
  }
}
