import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ReportsService } from './reports.service';
import { ReportExportService, TabularReport } from './report-export.service';
import { Roles } from '../../common/decorators/roles.decorator';

class ReportQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() month?: string; // YYYY-MM
  @IsOptional() @IsIn(['csv', 'excel', 'pdf']) format?: 'csv' | 'excel' | 'pdf';
}

@Controller('reports')
@Roles(Role.MANAGER, Role.FINANCE_OFFICER, Role.INVENTORY_OFFICER)
export class ReportsController {
  constructor(
    private reports: ReportsService,
    private exporter: ReportExportService,
  ) {}

  @Get(':type')
  async report(@Param('type') type: string, @Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    const p = this.reports.parsePeriod(q.from, q.to, q.month);
    const periodLabel = `${p.from.toISOString().slice(0, 10)} → ${p.to.toISOString().slice(0, 10)}`;

    let data: any;
    let tabular: TabularReport | null = null;

    switch (type) {
      case 'income-statement': {
        data = await this.reports.incomeStatement(p);
        tabular = {
          title: 'Income Statement',
          subtitle: periodLabel,
          columns: [
            { key: 'date', header: 'Date', width: 14 },
            { key: 'stoneCode', header: 'Stone', width: 12 },
            { key: 'gemType', header: 'Gem Type', width: 18 },
            { key: 'buyer', header: 'Buyer', width: 20 },
            { key: 'channel', header: 'Channel', width: 12 },
            { key: 'salePrice', header: 'Sale Price', width: 16, money: true },
            { key: 'totalCost', header: 'Total Cost', width: 16, money: true },
            { key: 'netProfit', header: 'Net Profit', width: 16, money: true },
            { key: 'profitPct', header: 'Profit %', width: 10 },
          ],
          rows: data.sales,
        };
        break;
      }
      case 'expenses': {
        data = await this.reports.expenseReport(p);
        tabular = {
          title: 'Expense Report',
          subtitle: periodLabel,
          columns: [
            { key: 'date', header: 'Date', width: 14 },
            { key: 'category', header: 'Category', width: 22 },
            { key: 'stoneCode', header: 'Stone', width: 12 },
            { key: 'amount', header: 'Amount', width: 16, money: true },
            { key: 'note', header: 'Note', width: 30 },
          ],
          rows: data.rows,
        };
        break;
      }
      case 'inventory': {
        data = await this.reports.inventoryReport();
        tabular = {
          title: 'Inventory Report',
          subtitle: `Generated ${new Date().toISOString().slice(0, 10)}`,
          columns: [
            { key: 'code', header: 'Code', width: 12 },
            { key: 'gemType', header: 'Gem Type', width: 18 },
            { key: 'weightCt', header: 'Weight (ct)', width: 12 },
            { key: 'status', header: 'Status', width: 18 },
            { key: 'location', header: 'Location', width: 16 },
            { key: 'purchaseDate', header: 'Purchased', width: 14 },
            { key: 'purchaseCost', header: 'Cost', width: 16, money: true },
            { key: 'expenses', header: 'Expenses', width: 16, money: true },
            { key: 'currentValue', header: 'Value', width: 16, money: true },
          ],
          rows: data.rows,
        };
        break;
      }
      case 'purchases': {
        data = await this.reports.purchaseReport(p);
        tabular = {
          title: 'Purchase Report',
          subtitle: periodLabel,
          columns: [
            { key: 'date', header: 'Date', width: 14 },
            { key: 'code', header: 'Code', width: 12 },
            { key: 'gemType', header: 'Gem Type', width: 18 },
            { key: 'weightCt', header: 'Weight (ct)', width: 12 },
            { key: 'location', header: 'Location', width: 16 },
            { key: 'seller', header: 'Seller', width: 20 },
            { key: 'cost', header: 'Cost', width: 16, money: true },
          ],
          rows: data.rows,
        };
        break;
      }
      case 'treatments': {
        data = await this.reports.treatmentReport(p);
        tabular = {
          title: 'Treatment Report',
          subtitle: periodLabel,
          columns: [
            { key: 'batchCode', header: 'Batch', width: 14 },
            { key: 'type', header: 'Type', width: 10 },
            { key: 'machine', header: 'Machine', width: 18 },
            { key: 'operator', header: 'Operator', width: 18 },
            { key: 'status', header: 'Status', width: 12 },
            { key: 'temperatureC', header: 'Temp °C', width: 10 },
            { key: 'stones', header: 'Stones', width: 26 },
          ],
          rows: data.rows,
        };
        break;
      }
      case 'exports': {
        data = await this.reports.exportReport(p);
        tabular = {
          title: 'Export Report',
          subtitle: periodLabel,
          columns: [
            { key: 'date', header: 'Date', width: 14 },
            { key: 'shipmentCode', header: 'Shipment', width: 14 },
            { key: 'buyer', header: 'Buyer', width: 20 },
            { key: 'country', header: 'Country', width: 14 },
            { key: 'courier', header: 'Courier', width: 14 },
            { key: 'stones', header: 'Stones', width: 24 },
            { key: 'value', header: 'Value', width: 16, money: true },
          ],
          rows: data.rows,
        };
        break;
      }
      case 'profit': {
        data = await this.reports.profitReport(p);
        tabular = {
          title: 'Profit Report',
          subtitle: periodLabel,
          columns: [
            { key: 'stoneCode', header: 'Stone', width: 12 },
            { key: 'gemType', header: 'Gem Type', width: 16 },
            { key: 'location', header: 'Location', width: 14 },
            { key: 'buyer', header: 'Buyer', width: 18 },
            { key: 'salePrice', header: 'Sale Price', width: 16, money: true },
            { key: 'totalCost', header: 'Cost', width: 16, money: true },
            { key: 'netProfit', header: 'Net Profit', width: 16, money: true },
            { key: 'roi', header: 'ROI %', width: 10 },
          ],
          rows: data.rows,
        };
        break;
      }
      case 'cash-flow':
        data = await this.reports.cashFlowReport(p);
        break;
      case 'gem-types':
        data = await this.reports.gemTypeReport();
        tabular = {
          title: 'Gem Type Report',
          columns: [
            { key: 'gemType', header: 'Gem Type', width: 20 },
            { key: 'inStock', header: 'In Stock', width: 10 },
            { key: 'stockValue', header: 'Stock Value', width: 16, money: true },
            { key: 'sold', header: 'Sold', width: 10 },
            { key: 'revenue', header: 'Revenue', width: 16, money: true },
            { key: 'profit', header: 'Profit', width: 16, money: true },
          ],
          rows: data.rows,
        };
        break;
      case 'locations':
        data = await this.reports.locationReport();
        tabular = {
          title: 'Purchase Location Report',
          columns: [
            { key: 'location', header: 'Location', width: 20 },
            { key: 'purchases', header: 'Purchases', width: 12 },
            { key: 'invested', header: 'Invested', width: 16, money: true },
            { key: 'sold', header: 'Sold', width: 10 },
            { key: 'profit', header: 'Profit', width: 16, money: true },
          ],
          rows: data.rows,
        };
        break;
      default:
        throw new BadRequestException(
          `Unknown report type "${type}". Valid: income-statement, expenses, inventory, purchases, treatments, exports, profit, cash-flow, gem-types, locations`,
        );
    }

    if (q.format && tabular) {
      // switch to non-passthrough streaming
      if (q.format === 'csv') return this.exporter.sendCsv(res as Response, tabular);
      if (q.format === 'excel') return this.exporter.sendExcel(res as Response, tabular);
      if (q.format === 'pdf') return this.exporter.sendPdf(res as Response, tabular);
    }
    return data;
  }
}
