import { PartialType } from '@nestjs/swagger';
import { CreateQuizzDto } from './create-quizz.dto';

export class UpdateQuizzDto extends PartialType(CreateQuizzDto) {}
