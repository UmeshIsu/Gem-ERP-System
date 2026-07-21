import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, StoneStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WorkflowService } from "../workflow/workflow.service";
import { ProfitService } from "../financials/profit.service";
import { paginate } from "../../common/dto/pagination.dto";
import {
  AddDocumentDto,
  AddImageDto,
  ChangeStatusDto,
  CreateStoneDto,
  StoneQueryDto,
  UpdateStoneDto,
} from "./dto/stone.dto";

const listInclude = {
  gemType: true,
  purchaseLocation: true,
  seller: true,
  images: { where: { sortOrder: 0 }, take: 1 },
  _count: { select: { children: true, expenses: true, certifications: true } },
} satisfies Prisma.StoneInclude;

@Injectable()
export class StonesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private workflow: WorkflowService,
    private profit: ProfitService,
  ) {}

  /** G0001, G0002 … zero-padded, atomic. */
  private async nextStoneCode(): Promise<string> {
    const n = await this.prisma.nextCounter("stone");
    return `G${String(n).padStart(4, "0")}`;
  }

  async create(dto: CreateStoneDto, userId: string) {
    const code = await this.nextStoneCode();

    const stone = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stone.create({
        data: {
          code,
          gemTypeId: dto.gemTypeId,
          purchaseLocationId: dto.purchaseLocationId,
          sellerId: dto.sellerId,
          workflowTemplateId: dto.workflowTemplateId,
          createdById: userId,
          stoneKind: dto.stoneKind,
          weightCt: dto.weightCt,
          shape: dto.shape,
          dimensions: dto.dimensions,
          color: dto.color,
          clarity: dto.clarity,
          origin: dto.origin ?? "Sri Lanka",
          purchaseDate: new Date(dto.purchaseDate),
          purchaseCost: dto.purchaseCost,
          currentValue: dto.currentValue ?? dto.purchaseCost,
          notes: dto.notes,
          tags: dto.tags ?? [],
        },
      });

      await this.workflow.buildStagePlan(
        tx,
        created.id,
        dto.workflowTemplateId,
        dto.skipStages ?? [],
      );

      await tx.stoneEvent.create({
        data: {
          stoneId: created.id,
          userId,
          kind: "STONE_CREATED",
          stage: "PURCHASE",
          title: "Stone purchased",
          detail: `Purchased for LKR ${dto.purchaseCost.toLocaleString()} (${dto.weightCt} ct)`,
        },
      });

      return created;
    });

    await this.audit.log({
      userId,
      action: "CREATE",
      entity: "Stone",
      entityId: stone.id,
      after: stone,
    });
    return this.findOne(stone.id);
  }

  async findAll(q: StoneQueryDto) {
    const where: Prisma.StoneWhereInput = {
      ...(q.includeArchived ? {} : { isArchived: false }),
      ...(q.status && { status: q.status }),
      ...(q.stoneKind && { stoneKind: q.stoneKind }),
      ...(q.gemTypeId && { gemTypeId: q.gemTypeId }),
      ...(q.purchaseLocationId && { purchaseLocationId: q.purchaseLocationId }),
      ...(q.sellerId && { sellerId: q.sellerId }),
      ...(q.tag && { tags: { has: q.tag } }),
      ...((q.purchasedFrom || q.purchasedTo) && {
        purchaseDate: {
          ...(q.purchasedFrom && { gte: new Date(q.purchasedFrom) }),
          ...(q.purchasedTo && { lte: new Date(q.purchasedTo) }),
        },
      }),
      ...((q.minWeight !== undefined || q.maxWeight !== undefined) && {
        weightCt: {
          ...(q.minWeight !== undefined && { gte: q.minWeight }),
          ...(q.maxWeight !== undefined && { lte: q.maxWeight }),
        },
      }),
      ...((q.minValue !== undefined || q.maxValue !== undefined) && {
        currentValue: {
          ...(q.minValue !== undefined && { gte: q.minValue }),
          ...(q.maxValue !== undefined && { lte: q.maxValue }),
        },
      }),
      ...(q.search && {
        OR: [
          { code: { contains: q.search, mode: "insensitive" as const } },
          { color: { contains: q.search, mode: "insensitive" as const } },
          { notes: { contains: q.search, mode: "insensitive" as const } },
          { origin: { contains: q.search, mode: "insensitive" as const } },
          {
            gemType: {
              name: { contains: q.search, mode: "insensitive" as const },
            },
          },
          {
            seller: {
              name: { contains: q.search, mode: "insensitive" as const },
            },
          },
          {
            certifications: {
              some: {
                certificateNumber: {
                  contains: q.search,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        ],
      }),
    };

    const orderBy: Prisma.StoneOrderByWithRelationInput = q.sortBy
      ? { [q.sortBy]: q.sortOrder }
      : { createdAt: "desc" };

    const [data, total] = await Promise.all([
      this.prisma.stone.findMany({
        where,
        include: listInclude,
        orderBy,
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.stone.count({ where }),
    ]);

    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const stone = await this.prisma.stone.findUniqueOrThrow({
      where: { id },
      include: {
        gemType: true,
        purchaseLocation: true,
        seller: true,
        workflowTemplate: true,
        createdBy: { select: { id: true, fullName: true } },
        parent: {
          select: { id: true, code: true, weightCt: true, status: true },
        },
        children: {
          select: {
            id: true,
            code: true,
            weightCt: true,
            status: true,
            purchaseCost: true,
            currentValue: true,
          },
        },
        stages: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: [{ stage: "asc" }, { sortOrder: "asc" }] },
        documents: true,
        expenses: {
          include: { category: true },
          orderBy: { incurredAt: "desc" },
        },
        cuttingRecords: { orderBy: { cuttingDate: "desc" } },
        certifications: { include: { laboratory: true } },
        batchLinks: { include: { batch: { include: { machine: true } } } },
        electricRuns: { include: { logs: { orderBy: { weekNumber: "asc" } } } },
        saleRecord: { include: { buyer: true } },
        exportItems: { include: { shipment: { include: { buyer: true } } } },
      },
    });

    const financials = await this.profit.computeForStone(id);
    const { electricRuns, ...rest } = stone;
    const activeElectricRun =
      electricRuns.find(
        (r) => r.status === "RUNNING" || r.status === "PAUSED",
      ) ??
      electricRuns[0] ??
      null;
    return { ...rest, electricRun: activeElectricRun, financials };
  }

  async getTimeline(id: string) {
    const [stages, events] = await Promise.all([
      this.prisma.stoneStage.findMany({
        where: { stoneId: id },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.stoneEvent.findMany({
        where: { stoneId: id },
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return { stages, events };
  }

  /** QR / barcode payloads — rendered client-side. */
  async getCodes(id: string) {
    const stone = await this.prisma.stone.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        code: true,
        weightCt: true,
        gemType: { select: { name: true } },
      },
    });
    return {
      qrPayload: JSON.stringify({
        v: 1,
        t: "AURA_STONE",
        code: stone.code,
        id: stone.id,
      }),
      barcodePayload: stone.code,
      label: `${stone.code} · ${stone.gemType.name} · ${stone.weightCt} ct`,
    };
  }

  async update(id: string, dto: UpdateStoneDto, userId: string) {
    const before = await this.prisma.stone.findUniqueOrThrow({ where: { id } });
    if (before.status === StoneStatus.SPLIT) {
      throw new BadRequestException(
        "A split parent stone is archived and cannot be edited",
      );
    }
    // Once sold, the SaleRecord has frozen the cost & profit — editing the stone
    // (e.g. purchaseCost) would make the stone detail and the reports disagree forever.
    const sale = await this.prisma.saleRecord.findUnique({
      where: { stoneId: id },
      select: { id: true },
    });
    if (sale) {
      throw new BadRequestException(
        "This stone has been sold — its details are frozen. The sale record preserves the final cost and profit, so they can no longer be edited.",
      );
    }

    const stone = await this.prisma.stone.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
    });

    await this.audit.log({
      userId,
      action: "UPDATE",
      entity: "Stone",
      entityId: id,
      before,
      after: stone,
    });
    return this.findOne(id);
  }

  /** Terminal statuses that must only be reached through their dedicated flows (which create the SaleRecord / SplitEvent and freeze the numbers). */
  private static readonly FLOW_ONLY_STATUSES: StoneStatus[] = [
    StoneStatus.EXPORTED,
    StoneStatus.SOLD_LOCALLY,
    StoneStatus.SPLIT,
  ];

  async changeStatus(id: string, dto: ChangeStatusDto, userId: string) {
    const before = await this.prisma.stone.findUniqueOrThrow({ where: { id } });

    if (StonesService.FLOW_ONLY_STATUSES.includes(dto.status)) {
      throw new BadRequestException(
        `"${dto.status}" is set automatically by the Export/Sale or Split process — use those flows so the sale/split record and profit are recorded correctly, not a manual status change.`,
      );
    }

    // A stone that already has a frozen sale is locked (it is also archived by the sale flow).
    const sale = await this.prisma.saleRecord.findUnique({
      where: { stoneId: id },
      select: { id: true },
    });
    if (sale) {
      throw new BadRequestException(
        "This stone has been sold — its status is locked.",
      );
    }
    if (before.status === StoneStatus.SPLIT) {
      throw new BadRequestException(
        "A split parent stone is archived and its status cannot be changed.",
      );
    }

    const stone = await this.prisma.stone.update({
      where: { id },
      data: {
        status: dto.status,
        isArchived:
          dto.status === StoneStatus.ARCHIVED
            ? true
            : before.status === StoneStatus.ARCHIVED
              ? false
              : before.isArchived,
      },
    });
    await this.prisma.stoneEvent.create({
      data: {
        stoneId: id,
        userId,
        kind: "STATUS_CHANGED",
        title: `Status changed: ${before.status} → ${dto.status}`,
        detail: dto.note,
      },
    });
    await this.audit.log({
      userId,
      action: "STATUS_CHANGE",
      entity: "Stone",
      entityId: id,
      before: { status: before.status },
      after: { status: dto.status },
    });
    return stone;
  }

  /** Stones are archived, never deleted. */
  async archive(id: string, userId: string) {
    return this.changeStatus(
      id,
      { status: StoneStatus.ARCHIVED, note: "Archived" },
      userId,
    );
  }

  // ── Media ───────────────────────────────────────────────

  async addImage(stoneId: string, dto: AddImageDto, userId: string) {
    const count = await this.prisma.stoneImage.count({
      where: { stoneId, stage: dto.stage },
    });
    const image = await this.prisma.stoneImage.create({
      data: { stoneId, ...dto, sortOrder: count },
    });
    await this.audit.log({
      userId,
      action: "ADD_IMAGE",
      entity: "Stone",
      entityId: stoneId,
      after: image,
    });
    return image;
  }

  async removeImage(stoneId: string, imageId: string, userId: string) {
    const image = await this.prisma.stoneImage.findUniqueOrThrow({
      where: { id: imageId },
    });
    if (image.stoneId !== stoneId)
      throw new BadRequestException("Image does not belong to this stone");
    await this.prisma.stoneImage.delete({ where: { id: imageId } });
    await this.audit.log({
      userId,
      action: "REMOVE_IMAGE",
      entity: "Stone",
      entityId: stoneId,
      before: image,
    });
    return { success: true };
  }

  async addDocument(stoneId: string, dto: AddDocumentDto, userId: string) {
    const doc = await this.prisma.stoneDocument.create({
      data: { stoneId, ...dto },
    });
    await this.audit.log({
      userId,
      action: "ADD_DOCUMENT",
      entity: "Stone",
      entityId: stoneId,
      after: doc,
    });
    return doc;
  }
}
