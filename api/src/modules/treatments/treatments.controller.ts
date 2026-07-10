import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { TreatmentsService } from './treatments.service';
import {
  BatchQueryDto,
  CompleteBatchDto,
  CreateBatchDto,
  CreateElectricDto,
  ElectricProgressDto,
  UpdateBatchDto,
  UpdateElectricDto,
} from './dto/treatment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

class BatchImageDto {
  @IsString() url!: string;
  @IsOptional() @IsString() caption?: string;
}

const HEAT_ROLES = [Role.MANAGER, Role.HEAT_OPERATOR] as const;

@Controller('treatments')
export class TreatmentsController {
  constructor(private treatments: TreatmentsService) {}

  // ── Batches (gas) ──────────────────────────────────────

  @Get('batches')
  listBatches(@Query() q: BatchQueryDto) {
    return this.treatments.listBatches(q);
  }

  @Get('batches/:id')
  getBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.treatments.getBatch(id);
  }

  @Post('batches')
  @Roles(...HEAT_ROLES)
  createBatch(@Body() dto: CreateBatchDto, @CurrentUser() user: AuthUser) {
    return this.treatments.createBatch(dto, user.id);
  }

  @Patch('batches/:id')
  @Roles(...HEAT_ROLES)
  updateBatch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBatchDto, @CurrentUser() user: AuthUser) {
    return this.treatments.updateBatch(id, dto, user.id);
  }

  @Post('batches/:id/start')
  @Roles(...HEAT_ROLES)
  startBatch(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.treatments.startBatch(id, user.id);
  }

  @Post('batches/:id/complete')
  @Roles(...HEAT_ROLES)
  completeBatch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteBatchDto, @CurrentUser() user: AuthUser) {
    return this.treatments.completeBatch(id, dto, user.id);
  }

  @Post('batches/:id/images')
  @Roles(...HEAT_ROLES)
  addBatchImage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BatchImageDto, @CurrentUser() user: AuthUser) {
    return this.treatments.addBatchImage(id, dto.url, dto.caption, user.id);
  }

  // ── Electric (week-based) ──────────────────────────────

  @Get('electric')
  listElectric(@Query() q: BatchQueryDto) {
    return this.treatments.listElectric(q);
  }

  @Post('electric')
  @Roles(...HEAT_ROLES)
  createElectric(@Body() dto: CreateElectricDto, @CurrentUser() user: AuthUser) {
    return this.treatments.createElectric(dto, user.id);
  }

  @Post('electric/:id/progress')
  @Roles(...HEAT_ROLES)
  addProgress(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ElectricProgressDto, @CurrentUser() user: AuthUser) {
    return this.treatments.addElectricProgress(id, dto, user.id);
  }

  @Patch('electric/:id')
  @Roles(...HEAT_ROLES)
  updateElectric(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateElectricDto, @CurrentUser() user: AuthUser) {
    return this.treatments.updateElectric(id, dto, user.id);
  }
}
