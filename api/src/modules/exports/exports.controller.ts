import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role, ShipmentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ExportsService } from './exports.service';
import {
  AddExportDocumentDto,
  AddShipmentItemDto,
  CreateShipmentDto,
  LocalSaleDto,
  ShipmentQueryDto,
  UpdateShipmentDto,
} from './dto/export.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

class SetStatusDto {
  @IsEnum(ShipmentStatus) status!: ShipmentStatus;
}

const EXPORT_ROLES = [Role.MANAGER, Role.FINANCE_OFFICER] as const;

@Controller('exports')
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Get()
  findAll(@Query() q: ShipmentQueryDto) {
    return this.exportsService.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exportsService.findOne(id);
  }

  @Post()
  @Roles(...EXPORT_ROLES)
  create(@Body() dto: CreateShipmentDto, @CurrentUser() user: AuthUser) {
    return this.exportsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...EXPORT_ROLES)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShipmentDto, @CurrentUser() user: AuthUser) {
    return this.exportsService.update(id, dto, user.id);
  }

  @Post(':id/items')
  @Roles(...EXPORT_ROLES)
  addItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddShipmentItemDto, @CurrentUser() user: AuthUser) {
    return this.exportsService.addItem(id, dto, user.id);
  }

  @Delete(':id/items/:itemId')
  @Roles(...EXPORT_ROLES)
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exportsService.removeItem(id, itemId, user.id);
  }

  @Post(':id/status')
  @Roles(...EXPORT_ROLES)
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto, @CurrentUser() user: AuthUser) {
    return this.exportsService.setStatus(id, dto.status, user.id);
  }

  @Post(':id/documents')
  @Roles(...EXPORT_ROLES)
  addDocument(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddExportDocumentDto, @CurrentUser() user: AuthUser) {
    return this.exportsService.addDocument(id, dto, user.id);
  }

  @Post('local-sale')
  @Roles(...EXPORT_ROLES)
  sellLocally(@Body() dto: LocalSaleDto, @CurrentUser() user: AuthUser) {
    return this.exportsService.sellLocally(dto, user.id);
  }
}
