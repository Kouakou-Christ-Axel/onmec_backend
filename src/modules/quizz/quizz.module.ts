import { Module } from '@nestjs/common';
import { QuizzService } from './quizz.service';
import { QuizzController } from './quizz.controller';

@Module({
  controllers: [QuizzController],
  providers: [QuizzService],
})
export class QuizzModule {}
