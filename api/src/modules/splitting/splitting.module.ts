import { Module } from '@nestjs/common';
import { SplittingController } from './splitting.controller';
import { SplittingService } from './splitting.service';

@Module({
  controllers: [SplittingController],
  providers: [SplittingService],
})
export class SplittingModule {}
