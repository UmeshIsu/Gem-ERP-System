import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface StoneFinancials {
  purchaseCost: number;
  expensesByCategory: { category: string; amount: number }[];
  totalExpenses: number;
  totalInvestment: number;
  currentValue: number | null;
  salePrice: number | null;
  grossProfit: number | null;
  netProfit: number | null;
  profitPct: number | null;
  roi: number | null;
}

const D = (v: Prisma.Decimal | number | null | undefined) => (v == null ? null : Number(v));

@Injectable()
export class ProfitService {
  constructor(private prisma: PrismaService) {}

  async computeForStone(stoneId: string): Promise<StoneFinancials> {
    const stone = await this.prisma.stone.findUniqueOrThrow({
      where: { id: stoneId },
      select: { purchaseCost: true, currentValue: true, salePrice: true, saleRecord: true },
    });

    const grouped = await this.prisma.stoneExpense.groupBy({
      by: ['categoryId'],
      where: { stoneId },
      _sum: { amount: true },
    });
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: grouped.map((g) => g.categoryId) } },
    });
    const expensesByCategory = grouped.map((g) => ({
      category: categories.find((c) => c.id === g.categoryId)?.name ?? 'Unknown',
      amount: Number(g._sum.amount ?? 0),
    }));

    const purchaseCost = Number(stone.purchaseCost);
    const totalExpenses = expensesByCategory.reduce((s, e) => s + e.amount, 0);
    const totalInvestment = purchaseCost + totalExpenses;

    const salePrice = D(stone.saleRecord?.salePrice ?? stone.salePrice);
    const grossProfit = salePrice != null ? salePrice - purchaseCost : null;
    const netProfit = salePrice != null ? salePrice - totalInvestment : null;

    return {
      purchaseCost,
      expensesByCategory,
      totalExpenses,
      totalInvestment,
      currentValue: D(stone.currentValue),
      salePrice,
      grossProfit,
      netProfit,
      profitPct: netProfit != null && totalInvestment > 0 ? +((netProfit / totalInvestment) * 100).toFixed(2) : null,
      roi: netProfit != null && totalInvestment > 0 ? +((netProfit / totalInvestment) * 100).toFixed(2) : null,
    };
  }

  /** Total cost basis (purchase + expenses) — used when freezing a SaleRecord. */
  async totalCost(stoneId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const db = tx ?? this.prisma;
    const stone = await db.stone.findUniqueOrThrow({ where: { id: stoneId }, select: { purchaseCost: true } });
    const agg = await db.stoneExpense.aggregate({ where: { stoneId }, _sum: { amount: true } });
    return Number(stone.purchaseCost) + Number(agg._sum.amount ?? 0);
  }
}
