import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerConfig() {
	return new DocumentBuilder()
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
}
