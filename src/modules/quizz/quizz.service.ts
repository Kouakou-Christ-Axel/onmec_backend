import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateQuizzDto } from './dto/create-quizz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

const prisma = new PrismaClient();

@Injectable()
export class QuizzService {
  /**
   * Créer un nouveau quiz avec ses questions et choix
   */
  async create(createQuizzDto: CreateQuizzDto) {
    const { title, description, authorId, questions } = createQuizzDto;

    // Créer le quiz avec toutes ses questions et choix
    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        authorId,
        questions: {
          create: questions.map((question) => {
            // Trouver l'index du choix correct
            const correctChoiceIndex = question.choices.findIndex((c) => c.isCorrect);

            return {
              text: question.text,
              correctId: correctChoiceIndex !== -1 ? undefined : null, // Mettre à jour plus tard si nécessaire
              choices: {
                create: question.choices.map((choice) => ({
                  text: choice.text,
                })),
              },
            };
          }),
        },
      },
      include: {
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });

    // Mettre à jour le correctId pour chaque question
    for (let i = 0; i < questions.length; i++) {
      const questionData = questions[i];
      const createdQuestion = quiz.questions[i];
      const correctChoiceIndex = questionData.choices.findIndex((c) => c.isCorrect);

      if (correctChoiceIndex !== -1) {
        const correctChoice = createdQuestion.choices[correctChoiceIndex];
        await prisma.question.update({
          where: { id: createdQuestion.id },
          data: { correctId: correctChoice.id },
        });
      }
    }

    // Récupérer le quiz complet mis à jour
    return prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        author: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });
  }

  /**
   * Récupérer tous les quiz
   */
  async findAll() {
    return prisma.quiz.findMany({
      include: {
        author: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
        questions: {
          include: {
            choices: true,
          },
        },
        _count: {
          select: {
            userQuizzes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Récupérer un quiz par son ID
   */
  async findOne(id: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz avec l'ID ${id} non trouvé`);
    }

    return quiz;
  }

  /**
   * Soumettre les réponses d'un utilisateur à un quiz
   */
  async submitAnswers(submitAnswerDto: SubmitAnswerDto) {
    const { userId, quizId, answers } = submitAnswerDto;

    // Vérifier que le quiz existe et récupérer les bonnes réponses
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz avec l'ID ${quizId} non trouvé`);
    }

    // Calculer le score
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (question && question.correctId === answer.choiceId) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / totalQuestions) * 100);

    // Enregistrer le résultat du quiz
    const userQuiz = await prisma.userQuiz.create({
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
            question: {
              select: {
                id: true,
                text: true,
                correctId: true,
              },
            },
            choice: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    return {
      userQuiz,
      score,
      correctCount,
      totalQuestions,
      percentage: score,
    };
  }

  /**
   * Récupérer les résultats d'un utilisateur
   */
  async getUserResults(userId: string) {
    return prisma.userQuiz.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                correctId: true,
              },
            },
            choice: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });
  }

  /**
   * Récupérer les statistiques d'un quiz
   */
  async getQuizStatistics(quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        userQuizzes: {
          select: {
            score: true,
            completedAt: true,
            user: {
              select: {
                id: true,
                fullname: true,
              },
            },
          },
        },
        questions: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz avec l'ID ${quizId} non trouvé`);
    }

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
        .sort((a, b) => (b.completedAt || new Date()).getTime() - (a.completedAt || new Date()).getTime())
        .slice(0, 10),
    };
  }

  /**
   * Supprimer un quiz
   */
  async remove(id: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz avec l'ID ${id} non trouvé`);
    }

    await prisma.quiz.delete({
      where: { id },
    });

    return {
      message: `Quiz "${quiz.title}" supprimé avec succès`,
    };
  }
}
