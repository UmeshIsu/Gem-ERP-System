import { CertificationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCertificationDto {
  @IsUUID() stoneId!: string;
  @IsUUID() laboratoryId!: string;
  @IsOptional() @IsString() certificateNumber?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCertificationDto {
  @IsOptional() @IsUUID() laboratoryId?: string;
  @IsOptional() @IsString() certificateNumber?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsString() pdfUrl?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsEnum(CertificationStatus) status?: CertificationStatus;
  @IsOptional() @IsString() notes?: string;
}

export class CertificationQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(CertificationStatus) status?: CertificationStatus;
  @IsOptional() @IsUUID() laboratoryId?: string;
  @IsOptional() @IsUUID() stoneId?: string;
}
