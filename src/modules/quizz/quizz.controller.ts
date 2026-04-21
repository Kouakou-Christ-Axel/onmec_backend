import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QuizzService } from './quizz.service';
import { CreateQuizzDto } from './dto/create-quizz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SearchQuizzDto } from './dto/search-quizz.dto';
import { CreateCategorieQuizDto, UpdateCategorieQuizDto } from './dto/create-categorie-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from '@prisma/client';
import { Request } from 'express';

@Controller('quizz')
export class QuizzController {
  constructor(private readonly quizService: QuizzService) {}

  // ─── Quiz ──────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() createQuizzDto: CreateQuizzDto) {
    const user = req.user as User;
    return this.quizService.create(createQuizzDto, user.id);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  submitAnswers(@Body() submitAnswerDto: SubmitAnswerDto) {
    return this.quizService.submitAnswers(submitAnswerDto);
  }

  @Get()
  findAll(@Query() query: SearchQuizzDto) {
    return this.quizService.findAll(query);
  }

  // ─── Catégories (avant :id pour éviter les conflits de routing) ────────────

  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createCategorie(@Body() dto: CreateCategorieQuizDto) {
    return this.quizService.createCategorie(dto);
  }

  @Get('categories')
  findAllCategories() {
    return this.quizService.findAllCategories();
  }

  @Get('categories/:id')
  findOneCategorie(@Param('id') id: string) {
    return this.quizService.findOneCategorie(id);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCategorie(@Param('id') id: string, @Body() dto: UpdateCategorieQuizDto) {
    return this.quizService.updateCategorie(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  removeCategorie(@Param('id') id: string) {
    return this.quizService.removeCategorie(id);
  }

  // ─── Quiz par ID (après les routes statiques) ──────────────────────────────

  @Get('results/:userId')
  @UseGuards(JwtAuthGuard)
  getUserResults(@Param('userId') userId: string) {
    return this.quizService.getUserResults(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizService.findOne(id);
  }

  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard)
  getQuizStatistics(@Param('id') id: string) {
    return this.quizService.getQuizStatistics(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.quizService.remove(id);
  }
}
