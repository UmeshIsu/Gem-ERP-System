import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CertificationsService } from './certifications.service';
import { CertificationQueryDto, CreateCertificationDto, UpdateCertificationDto } from './dto/certification.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

const CERT_ROLES = [Role.MANAGER, Role.INVENTORY_OFFICER] as const;

@Controller('certifications')
export class CertificationsController {
  constructor(private certs: CertificationsService) {}

  @Get()
  findAll(@Query() q: CertificationQueryDto) {
    return this.certs.findAll(q);
  }

  @Post()
  @Roles(...CERT_ROLES)
  create(@Body() dto: CreateCertificationDto, @CurrentUser() user: AuthUser) {
    return this.certs.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...CERT_ROLES)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCertificationDto, @CurrentUser() user: AuthUser) {
    return this.certs.update(id, dto, user.id);
  }
}
