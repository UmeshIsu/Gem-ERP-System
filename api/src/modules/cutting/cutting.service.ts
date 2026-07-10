import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StageKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WorkflowService } from '../workflow/workflow.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { CreateCuttingDto } from './dto/cutting.dto';

@Injectable()
export class CuttingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private workflow: WorkflowService,
  ) {}

  async findAll(q: PaginationQueryDto) {
    const where: Prisma.CuttingRecordWhereInput = q.search
      ? {
          OR: [
            { cutterName: { contains: q.search, mode: 'insensitive' } },
            { stone: { code: { contains: q.search, mode: 'insensitive' } } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.cuttingRecord.findMany({
        where,
        include: { stone: { select: { id: true, code: true, gemType: { select: { name: true } } } } },
        orderBy: { cuttingDate: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.cuttingRecord.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async create(dto: CreateCuttingDto, userId: string) {
    if (dto.weightAfterCt >= dto.weightBeforeCt) {
      throw new BadRequestException('Weight after cutting must be less than weight before');
    }
    const lossPct = +(((dto.weightBeforeCt - dto.weightAfterCt) / dto.weightBeforeCt) * 100).toFixed(2);

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cuttingRecord.create({
        data: {
          stoneId: dto.stoneId,
          cuttingDate: new Date(dto.cuttingDate),
          cutterName: dto.cutterName,
          weightBeforeCt: dto.weightBeforeCt,
          weightAfterCt: dto.weightAfterCt,
          lossPct,
          cost: dto.cost,
          notes: dto.notes,
        },
      });

      await tx.stone.update({ where: { id: dto.stoneId }, data: { weightCt: dto.weightAfterCt } });

      // Auto-record the cutting cost as an expense under the system category
      if (dto.cost > 0) {
        const category = await tx.expenseCategory.findUnique({ where: { name: 'Cutting' } });
        if (category) {
          await tx.stoneExpense.create({
            data: {
              stoneId: dto.stoneId,
              categoryId: category.id,
              amount: dto.cost,
              incurredAt: new Date(dto.cuttingDate),
              note: `Cutting by ${dto.cutterName}`,
            },
          });
        }
      }

      await this.workflow.completeStage(dto.stoneId, StageKind.CUTTING, userId, {
        detail: `Cut by ${dto.cutterName}: ${dto.weightBeforeCt} ct → ${dto.weightAfterCt} ct (−${lossPct}%)`,
        linkedEntity: 'CuttingRecord',
        linkedEntityId: created.id,
        tx,
      });

      return created;
    });

    await this.audit.log({ userId, action: 'CREATE', entity: 'CuttingRecord', entityId: record.id, after: record });
    return record;
  }
}
