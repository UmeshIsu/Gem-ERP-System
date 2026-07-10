import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

class AuditQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() action?: string;
}

@Controller('audit-logs')
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Query() q: AuditQueryDto) {
    return this.audit.findAll(q);
  }
}
