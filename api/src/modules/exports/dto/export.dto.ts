import { SaleChannel, ShipmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateShipmentDto {
  @IsUUID() buyerId!: string;
  @IsString() @IsNotEmpty() country!: string;
  @IsOptional() @IsDateString() exportDate?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsString() courier?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) shippingCost?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateShipmentDto extends CreateShipmentDto {
  @IsOptional() @IsUUID() declare buyerId: string;
  @IsOptional() @IsString() declare country: string;
}

export class AddShipmentItemDto {
  @IsUUID() stoneId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) salePrice!: number;
}

export class ShipmentQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(ShipmentStatus) status?: ShipmentStatus;
  @IsOptional() @IsUUID() buyerId?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class LocalSaleDto {
  @IsUUID() stoneId!: string;
  @IsOptional() @IsUUID() buyerId?: string;
  @IsDateString() saleDate!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) salePrice!: number;
}

export class AddExportDocumentDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() url!: string;
}

export { SaleChannel };
