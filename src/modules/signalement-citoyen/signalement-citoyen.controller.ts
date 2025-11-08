import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { SignalementCitoyenService } from './signalement-citoyen.service';
import { CreateSignalementCitoyenDto } from './dto/signalement-citoyen-dto/create-signalement-citoyen.dto';
import { UpdateSignalementCitoyenDto } from './dto/signalement-citoyen-dto/update-signalement-citoyen.dto';
import { Request } from 'express';
import { User } from '@prisma/client';
import { SearchSignalementCitoyenDto } from './dto/signalement-citoyen-dto/search-signalement-citoyen.dto';

@Controller('signalement-citoyen')
export class SignalementCitoyenController {
  constructor(
    private readonly signalementCitoyenService: SignalementCitoyenService,
  ) {}

  @Post()
  create(
    @Req() req: Request,
    @Body() createSignalementCitoyenDto: CreateSignalementCitoyenDto,
  ) {
    const user = req.user as User;
    createSignalementCitoyenDto.citoyenId = user.id;
    return this.signalementCitoyenService.create(createSignalementCitoyenDto);
  }

  @Get()
  findAll(@Query() searchDto: SearchSignalementCitoyenDto) {
    return this.signalementCitoyenService.findAll(searchDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.signalementCitoyenService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSignalementCitoyenDto: UpdateSignalementCitoyenDto,
  ) {
    return this.signalementCitoyenService.update(
      id,
      updateSignalementCitoyenDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.signalementCitoyenService.remove(id);
  }
}
