import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CuttingService } from './cutting.service';
import { CreateCuttingDto } from './dto/cutting.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('cutting')
export class CuttingController {
  constructor(private cutting: CuttingService) {}

  @Get()
  findAll(@Query() q: PaginationQueryDto) {
    return this.cutting.findAll(q);
  }

  @Post()
  @Roles(Role.MANAGER, Role.INVENTORY_OFFICER)
  create(@Body() dto: CreateCuttingDto, @CurrentUser() user: AuthUser) {
    return this.cutting.create(dto, user.id);
  }
}
