import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { CategorieSignalementService } from './categorie-signalement.service';
import { CreateCategorieSignalementDto } from '../dto/categorie-signalement-dto/create-categorie-signalement.dto';
import { UpdateCategorieSignalementDto } from '../dto/categorie-signalement-dto/update-categorie-signalement.dto';

@Controller('categorie-signalement')
export class CategorieSignalementController {
  constructor(private readonly categorieSignalementService: CategorieSignalementService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCategorieSignalementDto: CreateCategorieSignalementDto) {
    return await this.categorieSignalementService.create(createCategorieSignalementDto);
  }

  @Get()
  async findAll() {
    return await this.categorieSignalementService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.categorieSignalementService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCategorieSignalementDto: UpdateCategorieSignalementDto) {
    return await this.categorieSignalementService.update(id, updateCategorieSignalementDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.categorieSignalementService.remove(id);
  }
}
