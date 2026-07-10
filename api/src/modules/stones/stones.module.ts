import { Module } from '@nestjs/common';
import { StonesController } from './stones.controller';
import { StonesService } from './stones.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { FinancialsModule } from '../financials/financials.module';

@Module({
  imports: [WorkflowModule, FinancialsModule],
  controllers: [StonesController],
  providers: [StonesService],
  exports: [StonesService],
})
export class StonesModule {}
