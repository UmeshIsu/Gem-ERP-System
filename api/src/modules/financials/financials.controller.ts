import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FinancialsService } from './financials.service';
import { ProfitService } from './profit.service';
import {
  CreateCompanyExpenseDto,
  CreateExpenseCategoryDto,
  CreateStoneExpenseDto,
  ExpenseQueryDto,
  UpdateExpenseCategoryDto,
} from './dto/financials.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

const FIN_ROLES = [Role.MANAGER, Role.FINANCE_OFFICER] as const;

@Controller('financials')
export class FinancialsController {
  constructor(
    private financials: FinancialsService,
    private profit: ProfitService,
  ) {}

  @Get('categories')
  listCategories(@Query('includeInactive') includeInactive?: string) {
    return this.financials.listCategories(includeInactive === 'true');
  }

  @Post('categories')
  @Roles(...FIN_ROLES)
  createCategory(@Body() dto: CreateExpenseCategoryDto, @CurrentUser() user: AuthUser) {
    return this.financials.createCategory(dto, user.id);
  }

  @Patch('categories/:id')
  @Roles(...FIN_ROLES)
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExpenseCategoryDto, @CurrentUser() user: AuthUser) {
    return this.financials.updateCategory(id, dto, user.id);
  }

  @Get('expenses')
  listStoneExpenses(@Query() q: ExpenseQueryDto) {
    return this.financials.listStoneExpenses(q);
  }

  @Post('expenses')
  @Roles(...FIN_ROLES, Role.INVENTORY_OFFICER)
  addStoneExpense(@Body() dto: CreateStoneExpenseDto, @CurrentUser() user: AuthUser) {
    return this.financials.addStoneExpense(dto, user.id);
  }

  @Delete('expenses/:id')
  @Roles(...FIN_ROLES)
  removeStoneExpense(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.financials.removeStoneExpense(id, user.id);
  }

  @Get('company-expenses')
  listCompanyExpenses(@Query() q: ExpenseQueryDto) {
    return this.financials.listCompanyExpenses(q);
  }

  @Post('company-expenses')
  @Roles(...FIN_ROLES)
  addCompanyExpense(@Body() dto: CreateCompanyExpenseDto, @CurrentUser() user: AuthUser) {
    return this.financials.addCompanyExpense(dto, user.id);
  }

  @Get('stones/:stoneId/profit')
  stoneProfit(@Param('stoneId', ParseUUIDPipe) stoneId: string) {
    return this.profit.computeForStone(stoneId);
  }
}
