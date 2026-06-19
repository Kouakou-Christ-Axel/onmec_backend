import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/services/prisma.service';
import { CreateQuizzDto } from './dto/create-quizz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SearchQuizzDto } from './dto/search-quizz.dto';
import { CreateCategorieQuizDto, UpdateCategorieQuizDto } from './dto/create-categorie-quiz.dto';

@Injectable()
export class QuizzService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQuizzDto: CreateQuizzDto, authorId: string) {
    const { title, description, difficulte, categorieId, questions } = createQuizzDto;

    const quiz = await this.prisma.quiz.create({
      data: {
        title,
        description,
        difficulte,
        categorieId,
        authorId,
        questions: {
          create: questions.map((question) => ({
            text: question.text,
            correctId: null,
            choices: {
              create: question.choices.map((choice) => ({ text: choice.text })),
            },
          })),
        },
      },
      include: {
        questions: { include: { choices: true } },
      },
    });

    for (let i = 0; i < questions.length; i++) {
      const correctChoiceIndex = questions[i].choices.findIndex((c) => c.isCorrect);
      if (correctChoiceIndex !== -1) {
        const correctChoice = quiz.questions[i].choices[correctChoiceIndex];
        await this.prisma.question.update({
          where: { id: quiz.questions[i].id },
          data: { correctId: correctChoice.id },
        });
      }
    }

    return this.prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        author: { select: { id: true, fullname: true, email: true } },
        categorie: { select: { id: true, nom: true } },
        questions: { include: { choices: true } },
      },
    });
  }

  async findAll(query: SearchQuizzDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.QuizWhereInput = {};

    if (query.categorieId) where.categorieId = query.categorieId;
    if (query.difficulte) where.difficulte = query.difficulte;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quiz.findMany({
        where,
        include: {
          author: { select: { id: true, fullname: true, email: true } },
          categorie: { select: { id: true, nom: true } },
          questions: { include: { choices: true } },
          _count: { select: { userQuizzes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, fullname: true, email: true } },
        categorie: { select: { id: true, nom: true, description: true } },
        questions: { include: { choices: true } },
      },
    });

    if (!quiz) throw new NotFoundException(`Quiz avec l'ID ${id} non trouvé`);

    return quiz;
  }

  async submitAnswers(submitAnswerDto: SubmitAnswerDto) {
    const { userId, quizId, answers } = submitAnswerDto;

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { choices: true } } },
    });

    if (!quiz) throw new NotFoundException(`Quiz avec l'ID ${quizId} non trouvé`);

    let correctCount = 0;
    const totalQuestions = quiz.questions.length;

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (question && question.correctId === answer.choiceId) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / totalQuestions) * 100);

    const userQuiz = await this.prisma.userQuiz.create({
      data: {
        userId,
        quizId,
        score,
        completedAt: new Date(),
        answers: {
          create: answers.map((answer) => ({
            questionId: answer.questionId,
            choiceId: answer.choiceId,
          })),
        },
      },
      include: {
        answers: {
          include: {
            question: { select: { id: true, text: true, correctId: true } },
            choice: { select: { id: true, text: true } },
          },
        },
        quiz: { select: { id: true, title: true, description: true } },
      },
    });

    return { userQuiz, score, correctCount, totalQuestions, percentage: score };
  }

  async getUserResults(userId: string) {
    return this.prisma.userQuiz.findMany({
      where: { userId },
      include: {
        quiz: { select: { id: true, title: true, description: true } },
        answers: {
          include: {
            question: { select: { id: true, text: true, correctId: true } },
            choice: { select: { id: true, text: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async getQuizStatistics(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        userQuizzes: {
          select: {
            score: true,
            completedAt: true,
            user: { select: { id: true, fullname: true } },
          },
        },
        questions: { select: { id: true } },
      },
    });

    if (!quiz) throw new NotFoundException(`Quiz avec l'ID ${quizId} non trouvé`);

    const totalAttempts = quiz.userQuizzes.length;
    const averageScore =
      totalAttempts > 0
        ? quiz.userQuizzes.reduce((sum, uq) => sum + uq.score, 0) / totalAttempts
        : 0;

    return {
      quizId: quiz.id,
      title: quiz.title,
      totalQuestions: quiz.questions.length,
      totalAttempts,
      averageScore: Math.round(averageScore),
      recentAttempts: quiz.userQuizzes
        .sort(
          (a, b) =>
            (b.completedAt || new Date()).getTime() -
            (a.completedAt || new Date()).getTime(),
        )
        .slice(0, 10),
    };
  }

  async remove(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });

    if (!quiz) throw new NotFoundException(`Quiz avec l'ID ${id} non trouvé`);

    await this.prisma.quiz.delete({ where: { id } });

    return { message: `Quiz "${quiz.title}" supprimé avec succès` };
  }

  // ─── Catégories ────────────────────────────────────────────────────────────

  async createCategorie(dto: CreateCategorieQuizDto) {
    return this.prisma.categorieQuiz.create({ data: dto });
  }

  async findAllCategories() {
    return this.prisma.categorieQuiz.findMany({
      include: { _count: { select: { quizzes: true } } },
      orderBy: { nom: 'asc' },
    });
  }

  async findOneCategorie(id: string) {
    const categorie = await this.prisma.categorieQuiz.findUnique({
      where: { id },
      include: { _count: { select: { quizzes: true } } },
    });

    if (!categorie)
      throw new NotFoundException(`Catégorie avec l'ID ${id} non trouvée`);

    return categorie;
  }

  async updateCategorie(id: string, dto: UpdateCategorieQuizDto) {
    await this.findOneCategorie(id);
    return this.prisma.categorieQuiz.update({ where: { id }, data: dto });
  }

  async removeCategorie(id: string) {
    const categorie = await this.findOneCategorie(id);
    await this.prisma.categorieQuiz.delete({ where: { id } });
    return { message: `Catégorie "${categorie.nom}" supprimée avec succès` };
  }
}
