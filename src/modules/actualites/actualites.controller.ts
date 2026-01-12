import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {ActualitesService} from './actualites.service';
import {CreateActualiteDto} from './dto/create-actualite.dto';
import {UpdateActualiteDto} from './dto/update-actualite.dto';
import {FileInterceptor} from "@nestjs/platform-express";
import {GenerateConfigService} from '../../common/services/generate-config.service';
import {ApiBody, ApiConsumes, ApiOperation, ApiTags} from '@nestjs/swagger';
import {ActualitesSearchDto} from './dto/actualites-search.dto';
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";

@ApiTags('Actualités')
@Controller('actualites')
export class ActualitesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Créer une nouvelle actualité' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateActualiteDto,
  })
  @UseInterceptors(
    FileInterceptor(
      'image',
      GenerateConfigService.generateConfigSingleImageUpload('./uploads/actualites')
    )
  )
  create(
    @Body() createActualiteDto: CreateActualiteDto,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.actualitesService.create(createActualiteDto, image);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les actualités' })
  findAll(@Query() query: ActualitesSearchDto) {
    return this.actualitesService.findAll(query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Récupérer une actualité par son slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.actualitesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une actualité par son ID' })
  findOne(@Param('id') id: string) {
    return this.actualitesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mettre à jour une actualité' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UpdateActualiteDto,
  })
  @UseInterceptors(
    FileInterceptor(
      'image',
      GenerateConfigService.generateConfigSingleImageUpload('./uploads/actualites')
    )
  )
  update(
    @Param('id') id: string,
    @Body() updateActualiteDto: UpdateActualiteDto,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.actualitesService.update(id, updateActualiteDto, image);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer une actualité' })
  remove(@Param('id') id: string) {
    return this.actualitesService.remove(id);
  }
}
