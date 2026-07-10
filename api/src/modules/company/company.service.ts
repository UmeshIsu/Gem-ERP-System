import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** There is always exactly one company profile per deployment; create a default if missing. */
  async get() {
    let profile = await this.prisma.companyProfile.findFirst();
    if (!profile) {
      profile = await this.prisma.companyProfile.create({
        data: { companyName: process.env.COMPANY_NAME ?? 'AURA GEM ERP', currency: process.env.CURRENCY ?? 'LKR' },
      });
    }
    return profile;
  }

  async update(dto: UpdateCompanyDto, userId: string) {
    const before = await this.get();
    const profile = await this.prisma.companyProfile.update({ where: { id: before.id }, data: dto });
    await this.audit.log({ userId, action: 'UPDATE', entity: 'CompanyProfile', entityId: profile.id, before, after: profile });
    return profile;
  }
}
