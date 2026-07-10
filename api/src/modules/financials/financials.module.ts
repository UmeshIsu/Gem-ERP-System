import { Module } from '@nestjs/common';
import { FinancialsController } from './financials.controller';
import { FinancialsService } from './financials.service';
import { ProfitService } from './profit.service';

@Module({
  controllers: [FinancialsController],
  providers: [FinancialsService, ProfitService],
  exports: [ProfitService],
})
export class FinancialsModule {}
