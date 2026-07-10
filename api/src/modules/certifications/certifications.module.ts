import { Module } from '@nestjs/common';
import { CertificationsController } from './certifications.controller';
import { CertificationsService } from './certifications.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [CertificationsController],
  providers: [CertificationsService],
})
export class CertificationsModule {}
