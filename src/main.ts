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

const ALLOWED_ORIGINS: (string | RegExp)[] = [
	'http://localhost:3000',
	'http://localhost:8080',
	'https://mec-ci.org',
	/^https:\/\/[\w-]+\.mec-ci\.org$/,
];

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

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			transformOptions: {enableImplicitConversion: true},
		}),
	);

	app.useGlobalFilters(new PrismaExceptionFilter());

	app.use(helmet({
		crossOriginResourcePolicy: {policy: 'cross-origin'},
	}));

	app.use(compression());

	app.enableCors({
		origin: (origin, callback) => {
			if (!origin) return callback(null, true);
			const allowed = ALLOWED_ORIGINS.some(o =>
				typeof o === 'string' ? o === origin : o.test(origin),
			);
			callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
		},
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		credentials: true,
	});

	app.setGlobalPrefix('api/v1');

	const uploadsPath = join(__dirname, '..', '..', 'uploads');
	app.useStaticAssets(uploadsPath, {prefix: '/uploads'});

	app.useGlobalInterceptors(new RequestLoggerInterceptor());

	const config = new DocumentBuilder()
		.setTitle('Citoyen+ API')
		.setDescription(
			"API officielle de la plateforme Citoyen+ — application citoyenne de la Côte d'Ivoire. " +
			'Permet la gestion des actualités, signalements citoyens, bibliothèque de documents et quiz éducatifs.',
		)
		.setVersion('1.0')
		.setContact('Équipe Citoyen+', 'https://mec-ci.org', 'contact@mec-ci.org')
		.addBearerAuth(
			{type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header'},
			'JWT',
		)
		.addTag('Auth', 'Authentification et gestion des tokens JWT')
		.addTag('Utilisateurs', 'Gestion des comptes utilisateurs et membres')
		.addTag('Actualités', 'Publication et consultation des actualités')
		.addTag('Signalement Citoyen', 'Signalements de problèmes urbains par les citoyens')
		.addTag('Librairie', 'Bibliothèque de documents téléchargeables')
		.addTag('Quizz', 'Quiz éducatifs et résultats')
		.addServer('https://api.mec-ci.org', 'Production')
		.addServer('http://localhost:8081', 'Local')
		.build();

	const documentFactory = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/docs', app, documentFactory);

	app.enableShutdownHooks();

	await app.listen(process.env.PORT ?? 8081);
}

void bootstrap();
