import { Module } from '@nestjs/common';
import { LibrairieService } from './librairie.service';
import { LibrairieController } from './librairie.controller';

@Module({
  controllers: [LibrairieController],
  providers: [LibrairieService],
})
export class LibrairieModule {}
