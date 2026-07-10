import { BadRequestException, Injectable } from '@nestjs/common';
import { CostAllocation, StageKind, StageStatus, StoneStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SplitStoneDto } from './dto/split.dto';

const CHILD_SUFFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const UNSPLITTABLE: StoneStatus[] = [
  StoneStatus.SPLIT,
  StoneStatus.EXPORTED,
  StoneStatus.SOLD_LOCALLY,
  StoneStatus.ARCHIVED,
];

@Injectable()
export class SplittingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async split(parentId: string, dto: SplitStoneDto, userId: string) {
    if (dto.children.length < 2) throw new BadRequestException('A split must produce at least 2 child stones');
    if (dto.children.length > 26) throw new BadRequestException('A split can produce at most 26 child stones');

    const parent = await this.prisma.stone.findUniqueOrThrow({
      where: { id: parentId },
      include: { images: true, stages: true },
    });

    if (UNSPLITTABLE.includes(parent.status)) {
      throw new BadRequestException(`A stone with status ${parent.status} cannot be split`);
    }
    const parentCost = Number(parent.purchaseCost);

    // ── Cost allocation ──────────────────────────────────
    let allocatedCosts: number[];
    if (dto.allocation === CostAllocation.MANUAL) {
      if (dto.children.some((c) => c.allocatedCost == null)) {
        throw new BadRequestException('Manual allocation requires allocatedCost on every child');
      }
      allocatedCosts = dto.children.map((c) => Number(c.allocatedCost));
      const sum = +allocatedCosts.reduce((s, v) => s + v, 0).toFixed(2);
      if (Math.abs(sum - parentCost) > 0.01) {
        throw new BadRequestException(
          `Manual allocation must total the parent cost (${parentCost.toFixed(2)}), got ${sum.toFixed(2)}`,
        );
      }
    } else {
      const totalWeight = dto.children.reduce((s, c) => s + c.weightCt, 0);
      if (totalWeight <= 0) throw new BadRequestException('Total child weight must be positive');
      allocatedCosts = dto.children.map((c) => +((parentCost * c.weightCt) / totalWeight).toFixed(2));
      // put rounding remainder on the last child so the sum is exact
      const diff = +(parentCost - allocatedCosts.reduce((s, v) => s + v, 0)).toFixed(2);
      allocatedCosts[allocatedCosts.length - 1] = +(allocatedCosts[allocatedCosts.length - 1] + diff).toFixed(2);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const splitEvent = await tx.splitEvent.create({
        data: {
          parentStoneId: parent.id,
          allocation: dto.allocation,
          parentCost: parent.purchaseCost,
          childCount: dto.children.length,
          performedById: userId,
          notes: dto.notes,
        },
      });

      const children = [];
      for (let i = 0; i < dto.children.length; i++) {
        const c = dto.children[i];
        const code = `${parent.code}-${CHILD_SUFFIXES[i]}`;

        const child = await tx.stone.create({
          data: {
            code,
            parentId: parent.id,
            splitEventId: splitEvent.id,
            // inherited provenance
            gemTypeId: parent.gemTypeId,
            purchaseLocationId: parent.purchaseLocationId,
            sellerId: parent.sellerId,
            workflowTemplateId: parent.workflowTemplateId,
            createdById: userId,
            stoneKind: parent.stoneKind,
            origin: parent.origin,
            purchaseDate: parent.purchaseDate,
            purchaseCost: allocatedCosts[i],
            currentValue: allocatedCosts[i],
            // child-specific
            weightCt: c.weightCt,
            dimensions: c.dimensions,
            color: c.color ?? parent.color,
            clarity: c.clarity ?? parent.clarity,
            shape: c.shape ?? parent.shape,
            notes: c.notes,
            tags: parent.tags,
            status: StoneStatus.PURCHASED,
          },
        });

        // Child stage plan: copy the parent's plan minus SPLITTING; purchase already done.
        const parentStages = parent.stages
          .filter((s) => s.kind !== StageKind.SPLITTING)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        await tx.stoneStage.createMany({
          data: parentStages.map((s, idx) => ({
            stoneId: child.id,
            kind: s.kind,
            sortOrder: idx,
            status:
              s.kind === StageKind.PURCHASE
                ? StageStatus.COMPLETED
                : s.status === StageStatus.NOT_APPLICABLE
                  ? StageStatus.NOT_APPLICABLE
                  : StageStatus.PENDING,
            completedAt: s.kind === StageKind.PURCHASE ? parent.purchaseDate : null,
          })),
        });

        // Inherit parent's purchase images as references
        const purchaseImages = parent.images.filter((img) => img.stage === 'PURCHASE');
        if (purchaseImages.length > 0) {
          await tx.stoneImage.createMany({
            data: purchaseImages.map((img, idx) => ({
              stoneId: child.id,
              stage: 'PURCHASE' as const,
              url: img.url,
              thumbUrl: img.thumbUrl,
              caption: `Inherited from parent ${parent.code}`,
              sortOrder: idx,
            })),
          });
        }

        await tx.stoneEvent.create({
          data: {
            stoneId: child.id,
            userId,
            kind: 'CREATED_FROM_SPLIT',
            stage: StageKind.SPLITTING,
            title: `Created from split of ${parent.code}`,
            detail: `Allocated cost LKR ${allocatedCosts[i].toLocaleString()} (${dto.allocation === 'BY_WEIGHT' ? 'by weight' : 'manual'})`,
            metadata: { parentId: parent.id, parentCode: parent.code, splitEventId: splitEvent.id },
          },
        });

        children.push(child);
      }

      // Parent: SPLITTING stage completed, archived as SPLIT — kept forever.
      const splittingStage = parent.stages.find((s) => s.kind === StageKind.SPLITTING);
      if (splittingStage) {
        await tx.stoneStage.update({
          where: { id: splittingStage.id },
          data: {
            status: StageStatus.COMPLETED,
            startedAt: splittingStage.startedAt ?? new Date(),
            completedAt: new Date(),
            linkedEntity: 'SplitEvent',
            linkedEntityId: splitEvent.id,
          },
        });
      }
      await tx.stone.update({
        where: { id: parent.id },
        data: { status: StoneStatus.SPLIT, isArchived: true },
      });
      await tx.stoneEvent.create({
        data: {
          stoneId: parent.id,
          userId,
          kind: 'SPLIT',
          stage: StageKind.SPLITTING,
          title: `Split into ${children.length} child stones`,
          detail: children.map((c) => c.code).join(', '),
          metadata: { splitEventId: splitEvent.id, childIds: children.map((c) => c.id) },
        },
      });

      return { splitEvent, children };
    });

    await this.audit.log({
      userId,
      action: 'SPLIT',
      entity: 'Stone',
      entityId: parentId,
      before: { status: parent.status },
      after: {
        status: StoneStatus.SPLIT,
        children: result.children.map((c, i) => ({ code: c.code, weightCt: dto.children[i].weightCt, allocatedCost: allocatedCosts[i] })),
      },
    });

    return result;
  }

  getSplitEvent(parentId: string) {
    return this.prisma.splitEvent.findUnique({
      where: { parentStoneId: parentId },
      include: {
        parentStone: { select: { id: true, code: true, weightCt: true, purchaseCost: true } },
        children: { select: { id: true, code: true, weightCt: true, purchaseCost: true, status: true, currentValue: true } },
      },
    });
  }
}
