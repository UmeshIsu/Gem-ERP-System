import { Injectable } from '@nestjs/common';
import { BatchStatus, CertificationStatus, ElectricStatus, ShipmentStatus, StoneStatus } from '@prisma/client';
import { endOfMonth, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';

const IN_STOCK: StoneStatus[] = [
  StoneStatus.PURCHASED,
  StoneStatus.INSPECTION,
  StoneStatus.CRACK_REMOVAL,
  StoneStatus.SPLITTING,
  StoneStatus.HEAT_TREATMENT,
  StoneStatus.ELECTRIC_TREATMENT,
  StoneStatus.CUTTING,
  StoneStatus.POLISHING,
  StoneStatus.CERTIFICATION,
  StoneStatus.READY_FOR_EXPORT,
];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const todayStart = startOfDay(now);

    const [
      inventoryAgg,
      todayPurchases,
      monthPurchases,
      monthSalesAgg,
      monthStoneExpenses,
      monthCompanyExpenses,
      pendingHeat,
      runningHeat,
      electricQueue,
      upcomingExports,
      certificatesWaiting,
      recentPurchases,
      latestExports,
    ] = await Promise.all([
      this.prisma.stone.aggregate({
        where: { status: { in: IN_STOCK } },
        _sum: { currentValue: true, purchaseCost: true },
        _count: true,
      }),
      this.prisma.stone.aggregate({
        where: { createdAt: { gte: todayStart }, parentId: null },
        _sum: { purchaseCost: true },
        _count: true,
      }),
      this.prisma.stone.aggregate({
        where: { purchaseDate: { gte: monthStart, lte: monthEnd }, parentId: null },
        _sum: { purchaseCost: true },
        _count: true,
      }),
      this.prisma.saleRecord.aggregate({
        where: { saleDate: { gte: monthStart, lte: monthEnd } },
        _sum: { salePrice: true, netProfit: true },
        _count: true,
      }),
      this.prisma.stoneExpense.aggregate({
        where: { incurredAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.companyExpense.aggregate({
        where: { incurredAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.treatmentBatch.count({ where: { status: BatchStatus.PENDING } }),
      this.prisma.treatmentBatch.count({ where: { status: BatchStatus.RUNNING } }),
      this.prisma.electricTreatment.count({ where: { status: { in: [ElectricStatus.RUNNING, ElectricStatus.PAUSED] } } }),
      this.prisma.exportShipment.count({ where: { status: { in: [ShipmentStatus.DRAFT, ShipmentStatus.PENDING] } } }),
      this.prisma.certification.count({ where: { status: { in: [CertificationStatus.PENDING, CertificationStatus.SENT_TO_LAB] } } }),
      this.prisma.stone.findMany({
        where: { parentId: null },
        include: { gemType: true, purchaseLocation: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.exportShipment.findMany({
        where: { status: { in: [ShipmentStatus.SHIPPED, ShipmentStatus.DELIVERED] } },
        include: { buyer: true, items: true },
        orderBy: { exportDate: 'desc' },
        take: 5,
      }),
    ]);

    const monthExpenses = Number(monthStoneExpenses._sum.amount ?? 0) + Number(monthCompanyExpenses._sum.amount ?? 0);

    return {
      inventoryValue: Number(inventoryAgg._sum.currentValue ?? 0),
      inventoryCount: inventoryAgg._count,
      cashInvestment: Number(inventoryAgg._sum.purchaseCost ?? 0),
      todayPurchases: { total: Number(todayPurchases._sum.purchaseCost ?? 0), count: todayPurchases._count },
      monthPurchases: { total: Number(monthPurchases._sum.purchaseCost ?? 0), count: monthPurchases._count },
      monthSales: { total: Number(monthSalesAgg._sum.salePrice ?? 0), count: monthSalesAgg._count },
      monthProfit: Number(monthSalesAgg._sum.netProfit ?? 0),
      monthExpenses,
      pendingHeatTreatments: pendingHeat,
      runningHeatTreatments: runningHeat,
      electricQueue,
      upcomingExports,
      certificatesWaiting,
      recentPurchases,
      latestExports,
    };
  }

  async charts() {
    const now = new Date();
    const months: { key: string; label: string; start: Date; end: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en', { month: 'short' }),
        start: startOfMonth(d),
        end: endOfMonth(d),
      });
    }

    const [byGemType, byLocation, byStatus, sales, purchases, stoneExp, companyExp, expByCat, byCountry, topGemTypes] =
      await Promise.all([
        this.prisma.stone.groupBy({
          by: ['gemTypeId'],
          where: { status: { in: IN_STOCK } },
          _sum: { currentValue: true },
          _count: true,
        }),
        this.prisma.stone.groupBy({
          by: ['purchaseLocationId'],
          where: { parentId: null },
          _sum: { purchaseCost: true },
          _count: true,
        }),
        this.prisma.stone.groupBy({ by: ['status'], _count: true }),
        this.prisma.saleRecord.findMany({
          where: { saleDate: { gte: months[0].start } },
          select: { saleDate: true, salePrice: true, netProfit: true },
        }),
        this.prisma.stone.findMany({
          where: { purchaseDate: { gte: months[0].start }, parentId: null },
          select: { purchaseDate: true, purchaseCost: true },
        }),
        this.prisma.stoneExpense.findMany({
          where: { incurredAt: { gte: months[0].start } },
          select: { incurredAt: true, amount: true },
        }),
        this.prisma.companyExpense.findMany({
          where: { incurredAt: { gte: months[0].start } },
          select: { incurredAt: true, amount: true },
        }),
        this.prisma.stoneExpense.groupBy({ by: ['categoryId'], _sum: { amount: true } }),
        this.prisma.exportShipment.groupBy({
          by: ['country'],
          where: { status: { in: [ShipmentStatus.SHIPPED, ShipmentStatus.DELIVERED] } },
          _sum: { exportValue: true },
          _count: true,
        }),
        this.prisma.saleRecord.findMany({
          select: { netProfit: true, salePrice: true, stone: { select: { gemType: { select: { name: true } } } } },
        }),
      ]);

    const [gemTypes, locations, categories] = await Promise.all([
      this.prisma.gemType.findMany(),
      this.prisma.purchaseLocation.findMany(),
      this.prisma.expenseCategory.findMany(),
    ]);

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const trend = months.map((m) => {
      const revenue = sales.filter((s) => monthKey(s.saleDate) === m.key).reduce((s, r) => s + Number(r.salePrice), 0);
      const profit = sales.filter((s) => monthKey(s.saleDate) === m.key).reduce((s, r) => s + Number(r.netProfit), 0);
      const purchased = purchases.filter((p) => monthKey(p.purchaseDate) === m.key).reduce((s, r) => s + Number(r.purchaseCost), 0);
      const expenses =
        stoneExp.filter((e) => monthKey(e.incurredAt) === m.key).reduce((s, r) => s + Number(r.amount), 0) +
        companyExp.filter((e) => monthKey(e.incurredAt) === m.key).reduce((s, r) => s + Number(r.amount), 0);
      return { month: m.label, revenue, profit, purchases: purchased, expenses };
    });

    const gemTypePerf = new Map<string, { name: string; revenue: number; profit: number; count: number }>();
    for (const s of topGemTypes) {
      const name = s.stone.gemType.name;
      const cur = gemTypePerf.get(name) ?? { name, revenue: 0, profit: 0, count: 0 };
      cur.revenue += Number(s.salePrice);
      cur.profit += Number(s.netProfit);
      cur.count += 1;
      gemTypePerf.set(name, cur);
    }

    return {
      trend,
      inventoryByGemType: byGemType.map((g) => ({
        name: gemTypes.find((t) => t.id === g.gemTypeId)?.name ?? 'Unknown',
        value: Number(g._sum.currentValue ?? 0),
        count: g._count,
      })),
      purchasesByLocation: byLocation.map((l) => ({
        name: locations.find((x) => x.id === l.purchaseLocationId)?.name ?? 'Unknown',
        value: Number(l._sum.purchaseCost ?? 0),
        count: l._count,
      })),
      stonesByStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      expensesByCategory: expByCat.map((e) => ({
        name: categories.find((c) => c.id === e.categoryId)?.name ?? 'Unknown',
        value: Number(e._sum.amount ?? 0),
      })),
      exportsByCountry: byCountry.map((c) => ({ country: c.country, value: Number(c._sum.exportValue ?? 0), count: c._count })),
      topGemTypes: [...gemTypePerf.values()].sort((a, b) => b.profit - a.profit).slice(0, 8),
    };
  }
}
