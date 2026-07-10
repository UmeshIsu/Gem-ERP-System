import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(q: PaginationQueryDto) {
    const where: Prisma.UserWhereInput = q.search
      ? {
          OR: [
            { fullName: { contains: q.search, mode: 'insensitive' } },
            { email: { contains: q.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, select: userSelect });
  }

  async create(dto: CreateUserDto, actorId: string) {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        fullName: dto.fullName,
        role: dto.role,
        phone: dto.phone,
      },
      select: userSelect,
    });
    await this.audit.log({ userId: actorId, action: 'CREATE', entity: 'User', entityId: user.id, after: user });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const before = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: userSelect });
    const { password, ...rest } = dto;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
      select: userSelect,
    });
    await this.audit.log({ userId: actorId, action: 'UPDATE', entity: 'User', entityId: id, before, after: user });
    return user;
  }

  /** Users are deactivated, never deleted — their audit history must survive. */
  async deactivate(id: string, actorId: string) {
    if (id === actorId) throw new BadRequestException('You cannot deactivate your own account');
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });
    await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log({ userId: actorId, action: 'DEACTIVATE', entity: 'User', entityId: id, after: user });
    return user;
  }
}
