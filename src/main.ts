import {RequestLoggerInterceptor} from './request-logger/request-logger.interceptor';
import {ConsoleLogger, ValidationPipe} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {NestExpressApplication} from '@nestjs/platform-express';
import {SwaggerModule} from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import {join} from 'path';
import {PrismaExceptionFilter} from 'src/database/filters/prisma-exception.filter';
import {AppModule} from './app.module';
import {buildSwaggerConfig} from './swagger.config';

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
			// Refuse la requete au lieu de retirer silencieusement les champs
			// inconnus. Sans cela, un PATCH /users portant {"role":"ADMIN"}
			// passait la validation sans erreur ; seul le retrait du champ
			// cote modele empechait l'elevation de privileges.
			forbidNonWhitelisted: true,
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

	const documentFactory = SwaggerModule.createDocument(app, buildSwaggerConfig());
	SwaggerModule.setup('api/docs', app, documentFactory);

	app.enableShutdownHooks();

	await app.listen(process.env.PORT ?? 8081);
}

void bootstrap();
