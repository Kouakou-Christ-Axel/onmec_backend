import { Module } from '@nestjs/common';
import { AdminStatisticsService } from './admin-statistics.service';
import { AdminStatisticsController } from './admin-statistics.controller';

@Module({
  controllers: [AdminStatisticsController],
  providers: [AdminStatisticsService],
})
export class AdminStatisticsModule {}
