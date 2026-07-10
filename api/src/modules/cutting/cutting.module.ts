import { Module } from '@nestjs/common';
import { CuttingController } from './cutting.controller';
import { CuttingService } from './cutting.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [CuttingController],
  providers: [CuttingService],
})
export class CuttingModule {}
