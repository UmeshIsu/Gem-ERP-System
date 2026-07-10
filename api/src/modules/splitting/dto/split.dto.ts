import { CostAllocation } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SplitChildDto {
  @Type(() => Number) @IsNumber() @Min(0.001) weightCt!: number;
  @IsOptional() @IsString() dimensions?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() clarity?: string;
  @IsOptional() @IsString() shape?: string;
  @IsOptional() @IsString() notes?: string;
  /** Required when allocation = MANUAL */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) allocatedCost?: number;
}

export class SplitStoneDto {
  @IsEnum(CostAllocation) allocation!: CostAllocation;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(26)
  @ValidateNested({ each: true })
  @Type(() => SplitChildDto)
  children!: SplitChildDto[];

  @IsOptional() @IsString() notes?: string;
}
