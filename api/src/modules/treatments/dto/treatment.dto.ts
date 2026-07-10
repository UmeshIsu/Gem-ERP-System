import { BatchStatus, ElectricStatus, TreatmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateBatchDto {
  @IsEnum(TreatmentType) type!: TreatmentType;
  @IsUUID() machineId!: string;
  @IsOptional() @IsUUID() operatorId?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() expectedEndAt?: string;
  @IsOptional() @IsInt() @Min(0) temperatureC?: number;
  @IsOptional() @IsInt() @Min(0) durationHours?: number;
  @IsOptional() @IsString() remarks?: string;
  @IsArray() @ArrayMinSize(1) @IsUUID(undefined, { each: true }) stoneIds!: string[];
}

export class UpdateBatchDto {
  @IsOptional() @IsUUID() machineId?: string;
  @IsOptional() @IsUUID() operatorId?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() expectedEndAt?: string;
  @IsOptional() @IsInt() @Min(0) temperatureC?: number;
  @IsOptional() @IsInt() @Min(0) durationHours?: number;
  @IsOptional() @IsString() remarks?: string;
}

export class CompleteBatchDto {
  @IsEnum(BatchStatus) status!: BatchStatus; // COMPLETED or FAILED
  @IsOptional() @IsString() remarks?: string;
  @IsOptional()
  @IsArray()
  @Type(() => BatchStoneResultDto)
  results?: BatchStoneResultDto[];
}

export class BatchStoneResultDto {
  @IsUUID() stoneId!: string;
  @IsOptional() @IsString() result?: string;
  @IsOptional() @Type(() => Number) @IsNumber() weightAfterCt?: number;
}

export class BatchQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(BatchStatus) status?: BatchStatus;
  @IsOptional() @IsEnum(TreatmentType) type?: TreatmentType;
  @IsOptional() @IsUUID() machineId?: string;
}

export class CreateElectricDto {
  @IsUUID() stoneId!: string;
  @IsInt() @Min(1) @Max(104) plannedWeeks!: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ElectricProgressDto {
  @IsInt() @Min(1) weekNumber!: number;
  @IsInt() @Min(0) @Max(100) completionPct!: number;
  @IsOptional() @IsString() colorImprovement?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateElectricDto {
  @IsOptional() @IsEnum(ElectricStatus) status?: ElectricStatus;
  @IsOptional() @IsInt() @Min(1) plannedWeeks?: number;
  @IsOptional() @IsString() notes?: string;
}
