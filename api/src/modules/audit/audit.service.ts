import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Append-only. Never throws — auditing must not break business operations. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          before: (entry.before as Prisma.InputJsonValue) ?? undefined,
          after: (entry.after as Prisma.InputJsonValue) ?? undefined,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (e) {
      console.error('Audit log failed:', e);
    }
  }

  async findAll(q: PaginationQueryDto & { entity?: string; entityId?: string; userId?: string; action?: string }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.entity && { entity: q.entity }),
      ...(q.entityId && { entityId: q.entityId }),
      ...(q.userId && { userId: q.userId }),
      ...(q.action && { action: q.action }),
      ...(q.search && {
        OR: [
          { entity: { contains: q.search, mode: 'insensitive' } },
          { action: { contains: q.search, mode: 'insensitive' } },
          { entityId: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, q);
  }
}
