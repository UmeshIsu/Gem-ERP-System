import { Module } from '@nestjs/common';
import { TreatmentsController } from './treatments.controller';
import { TreatmentsService } from './treatments.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
})
export class TreatmentsModule {}
