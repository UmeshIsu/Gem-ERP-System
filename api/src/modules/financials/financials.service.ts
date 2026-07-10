import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { paginate } from '../../common/dto/pagination.dto';
import {
  CreateCompanyExpenseDto,
  CreateExpenseCategoryDto,
  CreateStoneExpenseDto,
  ExpenseQueryDto,
  UpdateExpenseCategoryDto,
} from './dto/financials.dto';

@Injectable()
export class FinancialsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Expense categories (unlimited, owner-defined) ────────

  listCategories(includeInactive = false) {
    return this.prisma.expenseCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreateExpenseCategoryDto, userId: string) {
    const cat = await this.prisma.expenseCategory.create({ data: dto });
    await this.audit.log({ userId, action: 'CREATE', entity: 'ExpenseCategory', entityId: cat.id, after: cat });
    return cat;
  }

  async updateCategory(id: string, dto: UpdateExpenseCategoryDto, userId: string) {
    const before = await this.prisma.expenseCategory.findUniqueOrThrow({ where: { id } });
    if (before.isSystem && dto.name && dto.name !== before.name) {
      throw new BadRequestException('System categories cannot be renamed');
    }
    const cat = await this.prisma.expenseCategory.update({ where: { id }, data: dto });
    await this.audit.log({ userId, action: 'UPDATE', entity: 'ExpenseCategory', entityId: id, before, after: cat });
    return cat;
  }

  // ── Stone expenses ────────────────────────────────────────

  async listStoneExpenses(q: ExpenseQueryDto) {
    const where: Prisma.StoneExpenseWhereInput = {
      ...(q.stoneId && { stoneId: q.stoneId }),
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...((q.from || q.to) && {
        incurredAt: {
          ...(q.from && { gte: new Date(q.from) }),
          ...(q.to && { lte: new Date(q.to) }),
        },
      }),
      ...(q.search && {
        OR: [
          { note: { contains: q.search, mode: 'insensitive' as const } },
          { stone: { code: { contains: q.search, mode: 'insensitive' as const } } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.stoneExpense.findMany({
        where,
        include: { category: true, stone: { select: { id: true, code: true } } },
        orderBy: { incurredAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.stoneExpense.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async addStoneExpense(dto: CreateStoneExpenseDto, userId: string) {
    const stone = await this.prisma.stone.findUniqueOrThrow({ where: { id: dto.stoneId }, select: { id: true, code: true, saleRecord: true } });
    if (stone.saleRecord) throw new BadRequestException('Cannot add expenses to a sold stone — its profit is frozen');

    const expense = await this.prisma.stoneExpense.create({
      data: {
        stoneId: dto.stoneId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        incurredAt: dto.incurredAt ? new Date(dto.incurredAt) : new Date(),
        note: dto.note,
      },
      include: { category: true },
    });

    await this.prisma.stoneEvent.create({
      data: {
        stoneId: dto.stoneId,
        userId,
        kind: 'EXPENSE_ADDED',
        title: `Expense added: ${expense.category.name}`,
        detail: `LKR ${dto.amount.toLocaleString()}${dto.note ? ` — ${dto.note}` : ''}`,
      },
    });
    await this.audit.log({ userId, action: 'CREATE', entity: 'StoneExpense', entityId: expense.id, after: expense });
    return expense;
  }

  async removeStoneExpense(id: string, userId: string) {
    const expense = await this.prisma.stoneExpense.findUniqueOrThrow({ where: { id }, include: { stone: { select: { saleRecord: true } } } });
    if (expense.stone.saleRecord) throw new BadRequestException('Cannot modify expenses of a sold stone');
    await this.prisma.stoneExpense.delete({ where: { id } });
    await this.audit.log({ userId, action: 'DELETE', entity: 'StoneExpense', entityId: id, before: expense });
    return { success: true };
  }

  // ── Company expenses (overheads) ─────────────────────────

  async listCompanyExpenses(q: ExpenseQueryDto) {
    const where: Prisma.CompanyExpenseWhereInput = {
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...((q.from || q.to) && {
        incurredAt: {
          ...(q.from && { gte: new Date(q.from) }),
          ...(q.to && { lte: new Date(q.to) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.companyExpense.findMany({
        where,
        include: { category: true },
        orderBy: { incurredAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.companyExpense.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async addCompanyExpense(dto: CreateCompanyExpenseDto, userId: string) {
    const expense = await this.prisma.companyExpense.create({
      data: {
        categoryId: dto.categoryId,
        amount: dto.amount,
        incurredAt: dto.incurredAt ? new Date(dto.incurredAt) : new Date(),
        note: dto.note,
      },
      include: { category: true },
    });
    await this.audit.log({ userId, action: 'CREATE', entity: 'CompanyExpense', entityId: expense.id, after: expense });
    return expense;
  }
}
