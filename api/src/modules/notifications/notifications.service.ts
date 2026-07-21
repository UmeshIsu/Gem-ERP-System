import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  BatchStatus,
  CertificationStatus,
  ElectricStatus,
  NotificationKind,
  ShipmentStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        OR: [
          { userId },
          {
            userId: null,
            reads: {
              none: { userId },
            },
          },
        ],
        ...(unreadOnly && {
          OR: [
            { userId, isRead: false },
            {
              userId: null,
              reads: {
                none: { userId },
              },
            },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        OR: [
          { userId, isRead: false },
          {
            userId: null,
            reads: {
              none: { userId },
            },
          },
        ],
      },
    });
    return { count };
  }

  async markRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findUniqueOrThrow({
      where: { id },
    });
    if (notif.userId === null) {
      await this.prisma.userNotificationRead.upsert({
        where: { userId_notificationId: { userId, notificationId: id } },
        update: {},
        create: { userId, notificationId: id },
      });
    } else {
      await this.prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    }
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    const unreadBroadcasts = await this.prisma.notification.findMany({
      where: {
        userId: null,
        reads: {
          none: { userId },
        },
      },
      select: { id: true },
    });

    if (unreadBroadcasts.length > 0) {
      await this.prisma.userNotificationRead.createMany({
        data: unreadBroadcasts.map((b) => ({
          userId,
          notificationId: b.id,
        })),
        skipDuplicates: true,
      });
    }

    return { success: true };
  }

  /** Daily checks that raise dashboard alerts. Deduped by title per day. */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runScheduledChecks() {
    this.logger.log("Running scheduled notification checks…");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dedupe = async (title: string) =>
      (await this.prisma.notification.count({
        where: { title, createdAt: { gte: today } },
      })) > 0;

    // Overdue gas batches
    const overdueBatches = await this.prisma.treatmentBatch.findMany({
      where: { status: BatchStatus.RUNNING, expectedEndAt: { lt: new Date() } },
    });
    for (const b of overdueBatches) {
      const title = `Batch ${b.batchCode} is past its expected finish`;
      if (!(await dedupe(title))) {
        await this.prisma.notification.create({
          data: {
            kind: NotificationKind.TREATMENT_FINISHED,
            title,
            link: `/treatments/${b.id}`,
          },
        });
      }
    }

    // Electric treatments due
    const dueElectric = await this.prisma.electricTreatment.findMany({
      where: {
        status: ElectricStatus.RUNNING,
        estimatedFinish: { lt: new Date() },
      },
      include: { stone: { select: { code: true } } },
    });
    for (const e of dueElectric) {
      const title = `Electric treatment for ${e.stone.code} is due`;
      if (!(await dedupe(title))) {
        await this.prisma.notification.create({
          data: {
            kind: NotificationKind.ELECTRIC_DUE,
            title,
            link: `/treatments/electric`,
          },
        });
      }
    }

    // Certificates waiting more than 14 days
    const cutoff = new Date(Date.now() - 14 * 86_400_000);
    const staleCerts = await this.prisma.certification.count({
      where: {
        status: CertificationStatus.SENT_TO_LAB,
        createdAt: { lt: cutoff },
      },
    });
    if (staleCerts > 0) {
      const title = `${staleCerts} certificate(s) pending at labs for over 14 days`;
      if (!(await dedupe(title))) {
        await this.prisma.notification.create({
          data: {
            kind: NotificationKind.CERTIFICATE_MISSING,
            title,
            link: `/certifications`,
          },
        });
      }
    }

    // Draft shipments older than 7 days
    const staleShipments = await this.prisma.exportShipment.count({
      where: {
        status: { in: [ShipmentStatus.DRAFT, ShipmentStatus.PENDING] },
        createdAt: { lt: new Date(Date.now() - 7 * 86_400_000) },
      },
    });
    if (staleShipments > 0) {
      const title = `${staleShipments} export shipment(s) pending for over 7 days`;
      if (!(await dedupe(title))) {
        await this.prisma.notification.create({
          data: {
            kind: NotificationKind.EXPORT_PENDING,
            title,
            link: `/exports`,
          },
        });
      }
    }
  }
}
