import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LibrairieService } from './librairie.service';
import { CreateDocumentDto, DocumentFilesDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { User } from '@prisma/client';
import { SearchDocumentDto } from './dto/search-document.dto';
import { UploadValidationPipe } from '../image-processing/upload-validation/upload-validation.pipe';

@Controller('librairie')
export class LibrairieController {
  constructor(private readonly librairieService: LibrairieService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'covers', maxCount: 1 },
      { name: 'fichiers', maxCount: 1 },
    ],{
      dest: './uploads/tmp/librairie',
    }),
  )
  create(
    @Req() req: Request,
    @Body() createLibrairieDto: CreateDocumentDto,
    @UploadedFiles(new UploadValidationPipe())
    files: DocumentFilesDto,
  ) {
    const user = req.user as User;
    createLibrairieDto.userId = user.id;

    return this.librairieService.create(createLibrairieDto, files);
  }

  @Get()
  findAll(@Query() searchParams: SearchDocumentDto) {
    return this.librairieService.findAll(searchParams);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.librairieService.findOne(id);
  }

  @Get(':id/file')
  async getFile(@Param('id') id: string) {
    return await this.librairieService.getFile(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLibrairieDto: UpdateDocumentDto,
  ) {
    return this.librairieService.update(id, updateLibrairieDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.librairieService.remove(id);
  }
}
