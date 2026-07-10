import { ImageStage, StageKind, StoneKind, StoneStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateStoneDto {
  @IsUUID() gemTypeId!: string;
  @IsOptional() @IsUUID() purchaseLocationId?: string;
  @IsOptional() @IsUUID() sellerId?: string;
  @IsUUID() workflowTemplateId!: string;

  @IsEnum(StoneKind) stoneKind!: StoneKind;

  @Type(() => Number) @IsNumber() @Min(0.001) weightCt!: number;
  @IsOptional() @IsString() shape?: string;
  @IsOptional() @IsString() dimensions?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() clarity?: string;
  @IsOptional() @IsString() origin?: string;

  @IsDateString() purchaseDate!: string;
  @Type(() => Number) @IsNumber() @Min(0) purchaseCost!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) currentValue?: number;

  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  /** Optional stages of the chosen template the owner opts out of (marked Not Applicable). */
  @IsOptional() @IsArray() @IsEnum(StageKind, { each: true }) skipStages?: StageKind[];
}

export class UpdateStoneDto {
  @IsOptional() @IsUUID() gemTypeId?: string;
  @IsOptional() @IsUUID() purchaseLocationId?: string;
  @IsOptional() @IsUUID() sellerId?: string;
  @IsOptional() @IsEnum(StoneKind) stoneKind?: StoneKind;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.001) weightCt?: number;
  @IsOptional() @IsString() shape?: string;
  @IsOptional() @IsString() dimensions?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() clarity?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) purchaseCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) currentValue?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class StoneQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(StoneStatus) status?: StoneStatus;
  @IsOptional() @IsEnum(StoneKind) stoneKind?: StoneKind;
  @IsOptional() @IsUUID() gemTypeId?: string;
  @IsOptional() @IsUUID() purchaseLocationId?: string;
  @IsOptional() @IsUUID() sellerId?: string;
  @IsOptional() @IsDateString() purchasedFrom?: string;
  @IsOptional() @IsDateString() purchasedTo?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minWeight?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxWeight?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minValue?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxValue?: number;
  @IsOptional() @IsBoolean() @Type(() => Boolean) includeArchived?: boolean;
  @IsOptional() @IsString() tag?: string;
}

export class AddImageDto {
  @IsString() url!: string;
  @IsOptional() @IsString() thumbUrl?: string;
  @IsEnum(ImageStage) stage!: ImageStage;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsBoolean() isVideo?: boolean;
}

export class AddDocumentDto {
  @IsString() name!: string;
  @IsString() url!: string;
  @IsOptional() @IsString() mimeType?: string;
}

export class ChangeStatusDto {
  @IsEnum(StoneStatus) status!: StoneStatus;
  @IsOptional() @IsString() note?: string;
}
