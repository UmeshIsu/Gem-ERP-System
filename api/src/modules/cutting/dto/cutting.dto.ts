import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCuttingDto {
  @IsUUID() stoneId!: string;
  @IsDateString() cuttingDate!: string;
  @IsString() @IsNotEmpty() cutterName!: string;
  @Type(() => Number) @IsNumber() @Min(0.001) weightBeforeCt!: number;
  @Type(() => Number) @IsNumber() @Min(0.001) weightAfterCt!: number;
  @Type(() => Number) @IsNumber() @Min(0) cost!: number;
  @IsOptional() @IsString() notes?: string;
}
