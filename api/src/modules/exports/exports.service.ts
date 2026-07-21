import { BadRequestException, Injectable } from "@nestjs/common";
import {
  NotificationKind,
  Prisma,
  SaleChannel,
  ShipmentStatus,
  StageKind,
  StoneStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WorkflowService } from "../workflow/workflow.service";
import { ProfitService } from "../financials/profit.service";
import { paginate } from "../../common/dto/pagination.dto";
import {
  AddExportDocumentDto,
  AddShipmentItemDto,
  CreateShipmentDto,
  LocalSaleDto,
  ShipmentQueryDto,
  UpdateShipmentDto,
} from "./dto/export.dto";

const include = {
  buyer: true,
  items: {
    include: {
      stone: {
        select: {
          id: true,
          code: true,
          weightCt: true,
          gemType: { select: { name: true } },
        },
      },
    },
  },
  documents: true,
} satisfies Prisma.ExportShipmentInclude;

const SOLD_STATUSES: StoneStatus[] = [
  StoneStatus.EXPORTED,
  StoneStatus.SOLD_LOCALLY,
  StoneStatus.SPLIT,
  StoneStatus.ARCHIVED,
];

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private workflow: WorkflowService,
    private profit: ProfitService,
  ) {}

  private async nextShipmentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const n = await this.prisma.nextCounter(`shipment-${year}`);
    return `EXP-${year}-${String(n).padStart(3, "0")}`;
  }

  async findAll(q: ShipmentQueryDto) {
    const where: Prisma.ExportShipmentWhereInput = {
      ...(q.status && { status: q.status }),
      ...(q.buyerId && { buyerId: q.buyerId }),
      ...(q.country && {
        country: { contains: q.country, mode: "insensitive" as const },
      }),
      ...((q.from || q.to) && {
        exportDate: {
          ...(q.from && { gte: new Date(q.from) }),
          ...(q.to && { lte: new Date(q.to) }),
        },
      }),
      ...(q.search && {
        OR: [
          {
            shipmentCode: { contains: q.search, mode: "insensitive" as const },
          },
          {
            invoiceNumber: { contains: q.search, mode: "insensitive" as const },
          },
          {
            trackingNumber: {
              contains: q.search,
              mode: "insensitive" as const,
            },
          },
          {
            buyer: {
              name: { contains: q.search, mode: "insensitive" as const },
            },
          },
          {
            items: {
              some: {
                stone: {
                  code: { contains: q.search, mode: "insensitive" as const },
                },
              },
            },
          },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.exportShipment.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.exportShipment.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  findOne(id: string) {
    return this.prisma.exportShipment.findUniqueOrThrow({
      where: { id },
      include,
    });
  }

  async create(dto: CreateShipmentDto, userId: string) {
    const shipment = await this.prisma.exportShipment.create({
      data: {
        shipmentCode: await this.nextShipmentCode(),
        buyerId: dto.buyerId,
        country: dto.country,
        exportDate: dto.exportDate ? new Date(dto.exportDate) : null,
        invoiceNumber: dto.invoiceNumber,
        courier: dto.courier,
        trackingNumber: dto.trackingNumber,
        shippingCost: dto.shippingCost,
        notes: dto.notes,
      },
      include,
    });
    await this.audit.log({
      userId,
      action: "CREATE",
      entity: "ExportShipment",
      entityId: shipment.id,
      after: shipment,
    });
    return shipment;
  }

  async update(id: string, dto: UpdateShipmentDto, userId: string) {
    const before = await this.prisma.exportShipment.findUniqueOrThrow({
      where: { id },
    });
    if (
      before.status === ShipmentStatus.SHIPPED ||
      before.status === ShipmentStatus.DELIVERED
    ) {
      throw new BadRequestException("A shipped consignment cannot be edited");
    }
    const shipment = await this.prisma.exportShipment.update({
      where: { id },
      data: {
        ...dto,
        exportDate: dto.exportDate ? new Date(dto.exportDate) : undefined,
      },
      include,
    });
    await this.audit.log({
      userId,
      action: "UPDATE",
      entity: "ExportShipment",
      entityId: id,
      before,
      after: shipment,
    });
    return shipment;
  }

  async addItem(shipmentId: string, dto: AddShipmentItemDto, userId: string) {
    const shipment = await this.prisma.exportShipment.findUniqueOrThrow({
      where: { id: shipmentId },
    });
    if (
      shipment.status !== ShipmentStatus.DRAFT &&
      shipment.status !== ShipmentStatus.PENDING
    ) {
      throw new BadRequestException(
        "Stones can only be added to a draft or pending shipment",
      );
    }
    const stone = await this.prisma.stone.findUniqueOrThrow({
      where: { id: dto.stoneId },
    });
    if (SOLD_STATUSES.includes(stone.status)) {
      throw new BadRequestException(
        `Stone ${stone.code} is not available for export (status ${stone.status})`,
      );
    }
    const existing = await this.prisma.exportItem.findFirst({
      where: {
        stoneId: dto.stoneId,
        shipment: {
          status: {
            in: [
              ShipmentStatus.DRAFT,
              ShipmentStatus.PENDING,
              ShipmentStatus.SHIPPED,
              ShipmentStatus.DELIVERED,
            ],
          },
        },
      },
    });
    if (existing)
      throw new BadRequestException(
        `Stone ${stone.code} is already in an active shipment`,
      );

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.exportItem.create({
        data: { shipmentId, stoneId: dto.stoneId, salePrice: dto.salePrice },
      });
      await this.recalcValue(shipmentId, tx);
      return created;
    });
    await this.audit.log({
      userId,
      action: "ADD_ITEM",
      entity: "ExportShipment",
      entityId: shipmentId,
      after: { stoneCode: stone.code, salePrice: dto.salePrice },
    });
    return item;
  }

  async removeItem(shipmentId: string, itemId: string, userId: string) {
    const shipment = await this.prisma.exportShipment.findUniqueOrThrow({
      where: { id: shipmentId },
    });
    if (
      shipment.status !== ShipmentStatus.DRAFT &&
      shipment.status !== ShipmentStatus.PENDING
    ) {
      throw new BadRequestException(
        "Items can only be removed from a draft or pending shipment",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.exportItem.delete({ where: { id: itemId } });
      await this.recalcValue(shipmentId, tx);
    });
    await this.audit.log({
      userId,
      action: "REMOVE_ITEM",
      entity: "ExportShipment",
      entityId: shipmentId,
      before: { itemId },
    });
    return { success: true };
  }

  private async recalcValue(shipmentId: string, tx: Prisma.TransactionClient) {
    const agg = await tx.exportItem.aggregate({
      where: { shipmentId },
      _sum: { salePrice: true },
    });
    await tx.exportShipment.update({
      where: { id: shipmentId },
      data: { exportValue: agg._sum.salePrice ?? 0 },
    });
  }

  /** Marks the shipment shipped: stones become EXPORTED, SaleRecords freeze the profit. */
  async markShipped(id: string, userId: string) {
    const shipment = await this.prisma.exportShipment.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { stone: true } }, buyer: true },
    });
    if (
      shipment.status === ShipmentStatus.SHIPPED ||
      shipment.status === ShipmentStatus.DELIVERED
    ) {
      throw new BadRequestException("Shipment is already shipped");
    }
    if (shipment.items.length === 0)
      throw new BadRequestException("Cannot ship an empty shipment");

    await this.prisma.$transaction(async (tx) => {
      await tx.exportShipment.update({
        where: { id },
        data: {
          status: ShipmentStatus.SHIPPED,
          exportDate: shipment.exportDate ?? new Date(),
        },
      });

      for (const item of shipment.items) {
        const salePrice = Number(item.salePrice);
        const totalCost = await this.profit.totalCost(item.stoneId, tx);
        const purchaseCost = Number(item.stone.purchaseCost);
        const grossProfit = +(salePrice - purchaseCost).toFixed(2);
        const netProfit = +(salePrice - totalCost).toFixed(2);
        const pct =
          totalCost > 0 ? +((netProfit / totalCost) * 100).toFixed(2) : 0;
        const marginPct =
          salePrice > 0 ? +((netProfit / salePrice) * 100).toFixed(2) : 0;

        await tx.saleRecord.create({
          data: {
            stoneId: item.stoneId,
            buyerId: shipment.buyerId,
            channel: SaleChannel.EXPORT,
            saleDate: shipment.exportDate ?? new Date(),
            salePrice,
            totalCost,
            grossProfit,
            netProfit,
            profitPct: marginPct,
            roi: pct,
          },
        });
        await tx.stone.update({
          where: { id: item.stoneId },
          data: { status: StoneStatus.EXPORTED, salePrice, isArchived: true },
        });
        await this.workflow.completeStage(
          item.stoneId,
          StageKind.EXPORT_SALE,
          userId,
          {
            detail: `Exported to ${shipment.buyer.name} (${shipment.country}) — ${shipment.shipmentCode} for LKR ${salePrice.toLocaleString()}`,
            linkedEntity: "ExportShipment",
            linkedEntityId: id,
            nextStatus: StoneStatus.EXPORTED,
            tx,
          },
        );
      }

      await tx.notification.create({
        data: {
          kind: NotificationKind.EXPORT_PENDING,
          title: `Shipment ${shipment.shipmentCode} shipped`,
          body: `${shipment.items.length} stone(s) to ${shipment.buyer.name}, ${shipment.country}`,
          link: `/exports/${id}`,
        },
      });
    });

    await this.audit.log({
      userId,
      action: "SHIP",
      entity: "ExportShipment",
      entityId: id,
      after: { status: "SHIPPED" },
    });
    return this.findOne(id);
  }

  async setStatus(id: string, status: ShipmentStatus, userId: string) {
    if (status === ShipmentStatus.SHIPPED) return this.markShipped(id, userId);
    const before = await this.prisma.exportShipment.findUniqueOrThrow({
      where: { id },
    });
    if (
      (before.status === ShipmentStatus.SHIPPED ||
        before.status === ShipmentStatus.DELIVERED) &&
      status === ShipmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "A shipped consignment cannot be cancelled",
      );
    }
    const shipment = await this.prisma.exportShipment.update({
      where: { id },
      data: { status },
      include,
    });
    await this.audit.log({
      userId,
      action: "STATUS_CHANGE",
      entity: "ExportShipment",
      entityId: id,
      before: { status: before.status },
      after: { status },
    });
    return shipment;
  }

  async addDocument(id: string, dto: AddExportDocumentDto, userId: string) {
    const doc = await this.prisma.exportDocument.create({
      data: { shipmentId: id, ...dto },
    });
    await this.audit.log({
      userId,
      action: "ADD_DOCUMENT",
      entity: "ExportShipment",
      entityId: id,
      after: doc,
    });
    return doc;
  }

  /** Sell a stone locally (outside a shipment). */
  async sellLocally(dto: LocalSaleDto, userId: string) {
    const stone = await this.prisma.stone.findUniqueOrThrow({
      where: { id: dto.stoneId },
    });
    if (SOLD_STATUSES.includes(stone.status)) {
      throw new BadRequestException(
        `Stone ${stone.code} cannot be sold (status ${stone.status})`,
      );
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      const totalCost = await this.profit.totalCost(dto.stoneId, tx);
      const purchaseCost = Number(stone.purchaseCost);
      const grossProfit = +(dto.salePrice - purchaseCost).toFixed(2);
      const netProfit = +(dto.salePrice - totalCost).toFixed(2);
      const pct =
        totalCost > 0 ? +((netProfit / totalCost) * 100).toFixed(2) : 0;
      const marginPct =
        dto.salePrice > 0 ? +((netProfit / dto.salePrice) * 100).toFixed(2) : 0;

      const created = await tx.saleRecord.create({
        data: {
          stoneId: dto.stoneId,
          buyerId: dto.buyerId,
          channel: SaleChannel.LOCAL,
          saleDate: new Date(dto.saleDate),
          salePrice: dto.salePrice,
          totalCost,
          grossProfit,
          netProfit,
          profitPct: marginPct,
          roi: pct,
        },
      });
      await tx.stone.update({
        where: { id: dto.stoneId },
        data: {
          status: StoneStatus.SOLD_LOCALLY,
          salePrice: dto.salePrice,
          isArchived: true,
        },
      });
      await this.workflow.completeStage(
        dto.stoneId,
        StageKind.EXPORT_SALE,
        userId,
        {
          detail: `Sold locally for LKR ${dto.salePrice.toLocaleString()}`,
          linkedEntity: "SaleRecord",
          linkedEntityId: created.id,
          nextStatus: StoneStatus.SOLD_LOCALLY,
          tx,
        },
      );
      return created;
    });

    await this.audit.log({
      userId,
      action: "SELL_LOCAL",
      entity: "Stone",
      entityId: dto.stoneId,
      after: sale,
    });
    return sale;
  }
}
