import {RequestLoggerInterceptor} from './request-logger/request-logger.interceptor';
import {ConsoleLogger, ValidationPipe} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {NestExpressApplication} from '@nestjs/platform-express';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import {join} from 'path';
import {PrismaExceptionFilter} from 'src/database/filters/prisma-exception.filter';
import {AppModule} from './app.module';

async function bootstrap() {
	const isProduction = process.env.NODE_ENV === 'production';
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		logger: new ConsoleLogger({
			timestamp: true,
			logLevels: isProduction
				? ['error', 'warn', 'log']
				: ['error', 'warn', 'debug', 'verbose', 'log'],
			json: isProduction,
			prefix: 'onmec',
			colors: !isProduction,
		}),
	});

	// injecter globalement ValidationPipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			transformOptions: {enableImplicitConversion: true},
		}),
	);

	// Appliquer le filtre globalement à toute l'application
	app.useGlobalFilters(new PrismaExceptionFilter());

	// Security middleware
	app.use(helmet({
		crossOriginResourcePolicy: {
			policy: 'cross-origin',
		},
	}));

	// Compression
	app.use(compression());

	// CORS
	app.enableCors({
		origin: [
			'http://localhost:3000',
			'http://localhost:8080',
			'https://mec-ci.org',
			'https://*.mec-ci.org',
		],
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		credentials: true,
	});

	// API prefix
	app.setGlobalPrefix('api/v1');

	// Configuration du dossier de téléchargement
	const uploadsPath = join(__dirname, '..','..', 'uploads');

	app.useStaticAssets(uploadsPath, {
		prefix: '/uploads',
	});

	app.useGlobalInterceptors(new RequestLoggerInterceptor());

	// Liaison du Swagger
	const config = new DocumentBuilder()
		.setTitle('OnMec API')
		.setDescription(
			"API officielle de la plateforme OnMec — application citoyenne de la Côte d'Ivoire. " +
			'Permet la gestion des actualités, signalements citoyens, bibliothèque de documents et quiz éducatifs.',
		)
		.setVersion('1.0')
		.setContact('Équipe OnMec', 'https://mec-ci.org', 'contact@mec-ci.org')
		.addBearerAuth(
			{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
			'JWT',
		)
		.addTag('Auth', "Authentification et gestion des tokens JWT")
		.addTag('Utilisateurs', "Gestion des comptes utilisateurs et membres")
		.addTag('Actualités', "Publication et consultation des actualités")
		.addTag('Signalement Citoyen', "Signalements de problèmes urbains par les citoyens")
		.addTag('Librairie', "Bibliothèque de documents téléchargeables")
		.addTag('Quizz', "Quiz éducatifs et résultats")
		.addServer('https://api.mec-ci.org', 'Production')
		.addServer('http://localhost:8081', 'Local')
		.build();

	const documentFactory = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/docs', app, documentFactory);

	// Lancer le serveur
	await app.listen(process.env.PORT ?? 8081);
}

void bootstrap();
