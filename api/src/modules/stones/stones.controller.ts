import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { StonesService } from './stones.service';
import {
  AddDocumentDto,
  AddImageDto,
  ChangeStatusDto,
  CreateStoneDto,
  StoneQueryDto,
  UpdateStoneDto,
} from './dto/stone.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

const WRITE_ROLES = [Role.MANAGER, Role.INVENTORY_OFFICER] as const;

@Controller('stones')
export class StonesController {
  constructor(private stones: StonesService) {}

  @Get()
  findAll(@Query() q: StoneQueryDto) {
    return this.stones.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stones.findOne(id);
  }

  @Get(':id/timeline')
  timeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.stones.getTimeline(id);
  }

  @Get(':id/codes')
  codes(@Param('id', ParseUUIDPipe) id: string) {
    return this.stones.getCodes(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateStoneDto, @CurrentUser() user: AuthUser) {
    return this.stones.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoneDto, @CurrentUser() user: AuthUser) {
    return this.stones.update(id, dto, user.id);
  }

  @Post(':id/status')
  @Roles(...WRITE_ROLES)
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto, @CurrentUser() user: AuthUser) {
    return this.stones.changeStatus(id, dto, user.id);
  }

  @Post(':id/archive')
  @Roles(...WRITE_ROLES)
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.stones.archive(id, user.id);
  }

  @Post(':id/images')
  @Roles(...WRITE_ROLES, Role.HEAT_OPERATOR)
  addImage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddImageDto, @CurrentUser() user: AuthUser) {
    return this.stones.addImage(id, dto, user.id);
  }

  @Delete(':id/images/:imageId')
  @Roles(...WRITE_ROLES)
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.stones.removeImage(id, imageId, user.id);
  }

  @Post(':id/documents')
  @Roles(...WRITE_ROLES, Role.FINANCE_OFFICER)
  addDocument(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddDocumentDto, @CurrentUser() user: AuthUser) {
    return this.stones.addDocument(id, dto, user.id);
  }
}
