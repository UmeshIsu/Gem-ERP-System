import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { FinancialsModule } from '../financials/financials.module';

@Module({
  imports: [WorkflowModule, FinancialsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
