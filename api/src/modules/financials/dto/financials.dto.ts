import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateExpenseCategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateExpenseCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateStoneExpenseDto {
  @IsUUID() stoneId!: string;
  @IsUUID() categoryId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsDateString() incurredAt?: string;
  @IsOptional() @IsString() note?: string;
}

export class CreateCompanyExpenseDto {
  @IsUUID() categoryId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsDateString() incurredAt?: string;
  @IsOptional() @IsString() note?: string;
}

export class ExpenseQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() stoneId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
