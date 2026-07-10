import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StonesModule } from './modules/stones/stones.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { SplittingModule } from './modules/splitting/splitting.module';
import { TreatmentsModule } from './modules/treatments/treatments.module';
import { CuttingModule } from './modules/cutting/cutting.module';
import { CertificationsModule } from './modules/certifications/certifications.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { ExportsModule } from './modules/exports/exports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { CompanyModule } from './modules/company/company.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    StonesModule,
    WorkflowModule,
    SplittingModule,
    TreatmentsModule,
    CuttingModule,
    CertificationsModule,
    FinancialsModule,
    ExportsModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    AuditModule,
    NotificationsModule,
    StorageModule,
    CompanyModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
