import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Role, StageKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { WorkflowService } from './workflow.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

class TemplateStageDto {
  @IsEnum(StageKind) kind!: StageKind;
  @IsBoolean() isOptional!: boolean;
}

class CreateTemplateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateStageDto) stages!: TemplateStageDto[];
}

class UpdateTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateStageDto) stages?: TemplateStageDto[];
}

class SkipStageDto {
  @IsEnum(StageKind) kind!: StageKind;
  @IsString() @IsNotEmpty() reason!: string;
}

class CompleteStageDto {
  @IsEnum(StageKind) kind!: StageKind;
  @IsOptional() @IsString() note?: string;
}

class ApplicabilityDto {
  @IsEnum(StageKind) kind!: StageKind;
  @IsBoolean() applicable!: boolean;
}

@Controller('workflow')
export class WorkflowController {
  constructor(private workflow: WorkflowService) {}

  @Get('templates')
  listTemplates() {
    return this.workflow.listTemplates();
  }

  @Post('templates')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() user: AuthUser) {
    return this.workflow.createTemplate(dto, user.id);
  }

  @Patch('templates/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto, @CurrentUser() user: AuthUser) {
    return this.workflow.updateTemplate(id, dto, user.id);
  }

  @Get('stones/:stoneId/plan')
  getPlan(@Param('stoneId', ParseUUIDPipe) stoneId: string) {
    return this.workflow.getPlan(stoneId);
  }

  @Post('stones/:stoneId/skip')
  @Roles(Role.MANAGER, Role.INVENTORY_OFFICER)
  skipStage(@Param('stoneId', ParseUUIDPipe) stoneId: string, @Body() dto: SkipStageDto, @CurrentUser() user: AuthUser) {
    return this.workflow.skipStage(stoneId, dto.kind, dto.reason, user.id);
  }

  @Post('stones/:stoneId/complete-stage')
  @Roles(Role.MANAGER, Role.INVENTORY_OFFICER)
  completeStage(@Param('stoneId', ParseUUIDPipe) stoneId: string, @Body() dto: CompleteStageDto, @CurrentUser() user: AuthUser) {
    return this.workflow.completeSimpleStage(stoneId, dto.kind, dto.note, user.id);
  }

  @Post('stones/:stoneId/applicability')
  @Roles(Role.MANAGER, Role.INVENTORY_OFFICER)
  setApplicability(
    @Param('stoneId', ParseUUIDPipe) stoneId: string,
    @Body() dto: ApplicabilityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflow.setStageApplicability(stoneId, dto.kind, dto.applicable, user.id);
  }
}
