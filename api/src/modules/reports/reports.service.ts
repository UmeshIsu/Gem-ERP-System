import { BadRequestException, Injectable } from '@nestjs/common';
import { ShipmentStatus, StoneStatus } from '@prisma/client';
import { endOfMonth, startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReportPeriod {
  from: Date;
  to: Date;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  parsePeriod(from?: string, to?: string, month?: string): ReportPeriod {
    if (month) {
      const [y, m] = month.split('-').map(Number);
      if (!y || !m) throw new BadRequestException('month must be YYYY-MM');
      const d = new Date(y, m - 1, 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    }
    return {
      from: from ? new Date(from) : startOfMonth(new Date()),
      to: to ? new Date(to) : endOfMonth(new Date()),
    };
  }

  /** Monthly income statement: revenue, COGS, expenses, gross & net profit. */
  async incomeStatement(p: ReportPeriod) {
    const sales = await this.prisma.saleRecord.findMany({
      where: { saleDate: { gte: p.from, lte: p.to } },
      include: { stone: { select: { code: true, gemType: { select: { name: true } } } }, buyer: true },
      orderBy: { saleDate: 'asc' },
    });
    const [stoneExpAgg, companyExp] = await Promise.all([
      this.prisma.stoneExpense.aggregate({ where: { incurredAt: { gte: p.from, lte: p.to } }, _sum: { amount: true } }),
      this.prisma.companyExpense.findMany({
        where: { incurredAt: { gte: p.from, lte: p.to } },
        include: { category: true },
      }),
    ]);

    const revenue = sales.reduce((s, r) => s + Number(r.salePrice), 0);
    const cogs = sales.reduce((s, r) => s + Number(r.totalCost), 0);
    const grossProfit = sales.reduce((s, r) => s + Number(r.grossProfit), 0);
    const netFromSales = sales.reduce((s, r) => s + Number(r.netProfit), 0);
    const periodStoneExpenses = Number(stoneExpAgg._sum.amount ?? 0);
    const overheads = companyExp.reduce((s, e) => s + Number(e.amount), 0);

    return {
      period: p,
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      netProfitFromSales: netFromSales,
      periodStoneExpenses,
      overheads,
      netProfit: netFromSales - overheads,
      salesCount: sales.length,
      sales: sales.map((r) => ({
        date: r.saleDate,
        stoneCode: r.stone.code,
        gemType: r.stone.gemType.name,
        buyer: r.buyer?.name ?? '—',
        channel: r.channel,
        salePrice: Number(r.salePrice),
        totalCost: Number(r.totalCost),
        netProfit: Number(r.netProfit),
        profitPct: Number(r.profitPct),
      })),
      overheadDetails: companyExp.map((e) => ({
        date: e.incurredAt,
        category: e.category.name,
        amount: Number(e.amount),
        note: e.note,
      })),
    };
  }

  async expenseReport(p: ReportPeriod) {
    const [stoneExpenses, companyExpenses] = await Promise.all([
      this.prisma.stoneExpense.findMany({
        where: { incurredAt: { gte: p.from, lte: p.to } },
        include: { category: true, stone: { select: { code: true } } },
        orderBy: { incurredAt: 'asc' },
      }),
      this.prisma.companyExpense.findMany({
        where: { incurredAt: { gte: p.from, lte: p.to } },
        include: { category: true },
        orderBy: { incurredAt: 'asc' },
      }),
    ]);

    const rows = [
      ...stoneExpenses.map((e) => ({
        date: e.incurredAt,
        category: e.category.name,
        stoneCode: e.stone.code,
        amount: Number(e.amount),
        note: e.note,
      })),
      ...companyExpenses.map((e) => ({
        date: e.incurredAt,
        category: e.category.name,
        stoneCode: '—',
        amount: Number(e.amount),
        note: e.note,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const byCategory = new Map<string, number>();
    for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);

    return {
      period: p,
      total: rows.reduce((s, r) => s + r.amount, 0),
      byCategory: [...byCategory.entries()].map(([category, amount]) => ({ category, amount })),
      rows,
    };
  }

  async inventoryReport() {
    const stones = await this.prisma.stone.findMany({
      where: { isArchived: false },
      include: {
        gemType: true,
        purchaseLocation: true,
        expenses: true,
      },
      orderBy: { code: 'asc' },
    });
    return {
      generatedAt: new Date(),
      count: stones.length,
      totalPurchaseCost: stones.reduce((s, x) => s + Number(x.purchaseCost), 0),
      totalCurrentValue: stones.reduce((s, x) => s + Number(x.currentValue ?? 0), 0),
      rows: stones.map((s) => ({
        code: s.code,
        gemType: s.gemType.name,
        weightCt: Number(s.weightCt),
        status: s.status,
        location: s.purchaseLocation?.name ?? '—',
        purchaseDate: s.purchaseDate,
        purchaseCost: Number(s.purchaseCost),
        expenses: s.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
        currentValue: Number(s.currentValue ?? 0),
      })),
    };
  }

  async purchaseReport(p: ReportPeriod) {
    const stones = await this.prisma.stone.findMany({
      where: { purchaseDate: { gte: p.from, lte: p.to }, parentId: null },
      include: { gemType: true, purchaseLocation: true, seller: true },
      orderBy: { purchaseDate: 'asc' },
    });
    return {
      period: p,
      count: stones.length,
      total: stones.reduce((s, x) => s + Number(x.purchaseCost), 0),
      rows: stones.map((s) => ({
        date: s.purchaseDate,
        code: s.code,
        gemType: s.gemType.name,
        weightCt: Number(s.weightCt),
        location: s.purchaseLocation?.name ?? '—',
        seller: s.seller?.name ?? '—',
        cost: Number(s.purchaseCost),
      })),
    };
  }

  async treatmentReport(p: ReportPeriod) {
    const batches = await this.prisma.treatmentBatch.findMany({
      where: { createdAt: { gte: p.from, lte: p.to } },
      include: { machine: true, operator: { select: { fullName: true } }, stones: { include: { stone: { select: { code: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      period: p,
      count: batches.length,
      rows: batches.map((b) => ({
        batchCode: b.batchCode,
        type: b.type,
        machine: b.machine.name,
        operator: b.operator?.fullName ?? '—',
        status: b.status,
        temperatureC: b.temperatureC,
        durationHours: b.durationHours,
        startAt: b.startAt,
        actualEndAt: b.actualEndAt,
        stones: b.stones.map((s) => s.stone.code).join(', '),
      })),
    };
  }

  async exportReport(p: ReportPeriod) {
    const shipments = await this.prisma.exportShipment.findMany({
      where: {
        exportDate: { gte: p.from, lte: p.to },
        status: { in: [ShipmentStatus.SHIPPED, ShipmentStatus.DELIVERED] },
      },
      include: { buyer: true, items: { include: { stone: { select: { code: true } } } } },
      orderBy: { exportDate: 'asc' },
    });
    return {
      period: p,
      count: shipments.length,
      totalValue: shipments.reduce((s, x) => s + Number(x.exportValue), 0),
      rows: shipments.map((s) => ({
        date: s.exportDate,
        shipmentCode: s.shipmentCode,
        buyer: s.buyer.name,
        country: s.country,
        courier: s.courier ?? '—',
        trackingNumber: s.trackingNumber ?? '—',
        stones: s.items.map((i) => i.stone.code).join(', '),
        value: Number(s.exportValue),
      })),
    };
  }

  async profitReport(p: ReportPeriod) {
    const sales = await this.prisma.saleRecord.findMany({
      where: { saleDate: { gte: p.from, lte: p.to } },
      include: { stone: { include: { gemType: true, purchaseLocation: true } }, buyer: true },
      orderBy: { netProfit: 'desc' },
    });
    return {
      period: p,
      totalRevenue: sales.reduce((s, r) => s + Number(r.salePrice), 0),
      totalNetProfit: sales.reduce((s, r) => s + Number(r.netProfit), 0),
      rows: sales.map((r) => ({
        stoneCode: r.stone.code,
        gemType: r.stone.gemType.name,
        location: r.stone.purchaseLocation?.name ?? '—',
        buyer: r.buyer?.name ?? '—',
        channel: r.channel,
        saleDate: r.saleDate,
        salePrice: Number(r.salePrice),
        totalCost: Number(r.totalCost),
        grossProfit: Number(r.grossProfit),
        netProfit: Number(r.netProfit),
        profitPct: Number(r.profitPct),
        roi: Number(r.roi),
      })),
    };
  }

  async cashFlowReport(p: ReportPeriod) {
    const [sales, purchases, stoneExpenses, companyExpenses] = await Promise.all([
      this.prisma.saleRecord.findMany({ where: { saleDate: { gte: p.from, lte: p.to } }, select: { saleDate: true, salePrice: true } }),
      this.prisma.stone.findMany({
        where: { purchaseDate: { gte: p.from, lte: p.to }, parentId: null },
        select: { purchaseDate: true, purchaseCost: true },
      }),
      this.prisma.stoneExpense.findMany({ where: { incurredAt: { gte: p.from, lte: p.to } }, select: { incurredAt: true, amount: true } }),
      this.prisma.companyExpense.findMany({ where: { incurredAt: { gte: p.from, lte: p.to } }, select: { incurredAt: true, amount: true } }),
    ]);
    const inflows = sales.reduce((s, r) => s + Number(r.salePrice), 0);
    const outflows =
      purchases.reduce((s, r) => s + Number(r.purchaseCost), 0) +
      stoneExpenses.reduce((s, r) => s + Number(r.amount), 0) +
      companyExpenses.reduce((s, r) => s + Number(r.amount), 0);
    return {
      period: p,
      inflows,
      outflows,
      netCashFlow: inflows - outflows,
      breakdown: {
        sales: inflows,
        purchases: purchases.reduce((s, r) => s + Number(r.purchaseCost), 0),
        stoneExpenses: stoneExpenses.reduce((s, r) => s + Number(r.amount), 0),
        overheads: companyExpenses.reduce((s, r) => s + Number(r.amount), 0),
      },
    };
  }

  async gemTypeReport() {
    const stones = await this.prisma.stone.findMany({
      include: { gemType: true, saleRecord: true },
    });
    const map = new Map<string, { gemType: string; inStock: number; stockValue: number; sold: number; revenue: number; profit: number }>();
    for (const s of stones) {
      const key = s.gemType.name;
      const cur = map.get(key) ?? { gemType: key, inStock: 0, stockValue: 0, sold: 0, revenue: 0, profit: 0 };
      if (s.saleRecord) {
        cur.sold += 1;
        cur.revenue += Number(s.saleRecord.salePrice);
        cur.profit += Number(s.saleRecord.netProfit);
      } else if (!s.isArchived) {
        cur.inStock += 1;
        cur.stockValue += Number(s.currentValue ?? 0);
      }
      map.set(key, cur);
    }
    return { generatedAt: new Date(), rows: [...map.values()].sort((a, b) => b.revenue - a.revenue) };
  }

  async locationReport() {
    const stones = await this.prisma.stone.findMany({
      where: { parentId: null },
      include: { purchaseLocation: true, saleRecord: true },
    });
    const map = new Map<string, { location: string; purchases: number; invested: number; sold: number; profit: number }>();
    for (const s of stones) {
      const key = s.purchaseLocation?.name ?? 'Unknown';
      const cur = map.get(key) ?? { location: key, purchases: 0, invested: 0, sold: 0, profit: 0 };
      cur.purchases += 1;
      cur.invested += Number(s.purchaseCost);
      if (s.saleRecord) {
        cur.sold += 1;
        cur.profit += Number(s.saleRecord.netProfit);
      }
      map.set(key, cur);
    }
    return { generatedAt: new Date(), rows: [...map.values()].sort((a, b) => b.invested - a.invested) };
  }
}
