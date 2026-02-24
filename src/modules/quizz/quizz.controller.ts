import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards} from '@nestjs/common';
import {QuizzService} from './quizz.service';
import {CreateQuizzDto} from './dto/create-quizz.dto';
import {SubmitAnswerDto} from './dto/submit-answer.dto';
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {User} from "@prisma/client";
import {Request} from "express";

@Controller('quizz')
export class QuizzController {
	constructor(private readonly quizzService: QuizzService) {
	}

	/**
	 * Créer un nouveau quiz
	 * POST /quizz
	 */
	@Post()
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.CREATED)
	create(@Req() req: Request, @Body() createQuizzDto: CreateQuizzDto) {
		const user = req.user as User;
		return this.quizzService.create(createQuizzDto, user.id);
	}

	/**
	 * Récupérer tous les quiz
	 * GET /quizz
	 */
	@Get()
	findAll() {
		return this.quizzService.findAll();
	}

	/**
	 * Récupérer un quiz par son ID
	 * GET /quizz/:id
	 */
	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.quizzService.findOne(id);
	}

	/**
	 * Soumettre les réponses à un quiz
	 * POST /quizz/submit
	 */
	@Post('submit')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard)
	submitAnswers(@Body() submitAnswerDto: SubmitAnswerDto) {
		return this.quizzService.submitAnswers(submitAnswerDto);
	}

	/**
	 * Récupérer les résultats d'un utilisateur
	 * GET /quizz/results/:userId
	 */
	@Get('results/:userId')
	@UseGuards(JwtAuthGuard)
	getUserResults(@Param('userId') userId: string) {
		return this.quizzService.getUserResults(userId);
	}

	/**
	 * Récupérer les statistiques d'un quiz
	 * GET /quizz/:id/statistics
	 */
	@Get(':id/statistics')
	@UseGuards(JwtAuthGuard)
	getQuizStatistics(@Param('id') id: string) {
		return this.quizzService.getQuizStatistics(id);
	}

	/**
	 * Supprimer un quiz
	 * DELETE /quizz/:id
	 */
	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	remove(@Param('id') id: string) {
		return this.quizzService.remove(id);
	}
}
