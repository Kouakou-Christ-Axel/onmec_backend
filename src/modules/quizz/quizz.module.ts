import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { QuizzService } from './quizz.service';
import { QuizzController } from './quizz.controller';

@Module({
  imports: [GamificationModule],
  controllers: [QuizzController],
  providers: [QuizzService],
})
export class QuizzModule {}
