import { Injectable } from "@nestjs/common";
import { CertificationStatus, Prisma, StageKind } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WorkflowService } from "../workflow/workflow.service";
import { paginate } from "../../common/dto/pagination.dto";
import {
  CertificationQueryDto,
  CreateCertificationDto,
  UpdateCertificationDto,
} from "./dto/certification.dto";

const include = {
  laboratory: true,
  stone: {
    select: {
      id: true,
      code: true,
      weightCt: true,
      gemType: { select: { name: true } },
    },
  },
} satisfies Prisma.CertificationInclude;

@Injectable()
export class CertificationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private workflow: WorkflowService,
  ) {}

  async findAll(q: CertificationQueryDto) {
    const where: Prisma.CertificationWhereInput = {
      ...(q.status && { status: q.status }),
      ...(q.laboratoryId && { laboratoryId: q.laboratoryId }),
      ...(q.stoneId && { stoneId: q.stoneId }),
      ...(q.search && {
        OR: [
          {
            certificateNumber: {
              contains: q.search,
              mode: "insensitive" as const,
            },
          },
          {
            stone: {
              code: { contains: q.search, mode: "insensitive" as const },
            },
          },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.certification.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.certification.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async create(dto: CreateCertificationDto, userId: string) {
    const cert = await this.prisma.$transaction(async (tx) => {
      const created = await tx.certification.create({
        data: {
          stoneId: dto.stoneId,
          laboratoryId: dto.laboratoryId,
          certificateNumber: dto.certificateNumber,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
          cost: dto.cost,
          notes: dto.notes,
          status: CertificationStatus.SENT_TO_LAB,
        },
        include,
      });

      if (dto.cost && dto.cost > 0) {
        const category = await tx.expenseCategory.findUnique({
          where: { name: "Certification" },
        });
        if (category) {
          await tx.stoneExpense.create({
            data: {
              stoneId: dto.stoneId,
              categoryId: category.id,
              amount: dto.cost,
              note: `Certification — ${created.laboratory.name}`,
            },
          });
        }
      }

      await this.workflow.startStage(
        dto.stoneId,
        StageKind.CERTIFICATION,
        userId,
        {
          linkedEntity: "Certification",
          linkedEntityId: created.id,
          tx,
        },
      );

      return created;
    });

    await this.audit.log({
      userId,
      action: "CREATE",
      entity: "Certification",
      entityId: cert.id,
      after: cert,
    });
    return cert;
  }

  async update(id: string, dto: UpdateCertificationDto, userId: string) {
    const before = await this.prisma.certification.findUniqueOrThrow({
      where: { id },
      include: { laboratory: true },
    });

    const cert = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.certification.update({
        where: { id },
        data: {
          ...dto,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        },
        include,
      });

      if (dto.cost !== undefined && Number(before.cost ?? 0) !== dto.cost) {
        const category = await tx.expenseCategory.findUnique({
          where: { name: "Certification" },
        });
        if (category) {
          const note = `Certification — ${before.laboratory.name}`;
          const existingExpense = await tx.stoneExpense.findFirst({
            where: {
              stoneId: before.stoneId,
              categoryId: category.id,
              note,
            },
          });

          if (dto.cost !== null && dto.cost > 0) {
            if (existingExpense) {
              await tx.stoneExpense.update({
                where: { id: existingExpense.id },
                data: { amount: dto.cost },
              });
            } else {
              await tx.stoneExpense.create({
                data: {
                  stoneId: before.stoneId,
                  categoryId: category.id,
                  amount: dto.cost,
                  note,
                },
              });
            }
          } else {
            if (existingExpense) {
              await tx.stoneExpense.delete({
                where: { id: existingExpense.id },
              });
            }
          }
        }
      }

      if (
        dto.status === CertificationStatus.ISSUED &&
        before.status !== CertificationStatus.ISSUED
      ) {
        await this.workflow.completeStage(
          before.stoneId,
          StageKind.CERTIFICATION,
          userId,
          {
            detail: `Certificate ${updated.certificateNumber ?? ""} issued by ${updated.laboratory.name}`,
            linkedEntity: "Certification",
            linkedEntityId: id,
            tx,
          },
        );
      }
      return updated;
    });

    await this.audit.log({
      userId,
      action: "UPDATE",
      entity: "Certification",
      entityId: id,
      before,
      after: cert,
    });
    return cert;
  }
}
