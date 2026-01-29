import {
	Body,
	Controller,
	Delete,
	Get,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import {SignalementCitoyenService} from './signalement-citoyen.service';
import {CreateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/create-signalement-citoyen.dto';
import {UpdateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/update-signalement-citoyen.dto';
import {Request} from 'express';
import {User} from '@prisma/client';
import {SearchSignalementCitoyenDto} from './dto/signalement-citoyen-dto/search-signalement-citoyen.dto';
import {ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags,} from '@nestjs/swagger';
import {SignalementCitoyenDto} from './dto/signalement-citoyen-dto/signalement-citoyen.dto';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {AdminGuard} from '../auth/guards/admin.guard';
import {FilesInterceptor} from '@nestjs/platform-express';

@ApiTags('Signalement Citoyen')
@ApiBearerAuth()
@Controller('signalement-citoyen')
export class SignalementCitoyenController {
	constructor(
		private readonly signalementCitoyenService: SignalementCitoyenService,
	) {
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	@UseInterceptors(FilesInterceptor('photo', 1, {
		dest: './uploads/tmp/signalements',
	}))
	@ApiOperation({
		summary: 'Créer un nouveau signalement citoyen',
		description:
			'Permet à un citoyen authentifié de créer un signalement pour un problème rencontré dans sa ville',
	})
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		type: CreateSignalementCitoyenDto
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: 'Le signalement a été créé avec succès',
		type: SignalementCitoyenDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Données invalides',
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	create(
		@Req() req: Request,
		@Body() createSignalementCitoyenDto: CreateSignalementCitoyenDto,
		@UploadedFiles()
		files: Express.Multer.File[],
	) {
		const user = req.user as User;
		createSignalementCitoyenDto.citoyenId = user.id;
		return this.signalementCitoyenService.create(
			createSignalementCitoyenDto,
			files,
		);
	}

	@Get()
	@ApiOperation({
		summary: 'Récupérer tous les signalements',
		description:
			'Retourne une liste paginée de signalements avec possibilité de filtrer par différents critères',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Liste des signalements récupérée avec succès',
		schema: {
			type: 'object',
			properties: {
				data: {
					type: 'array',
					items: {$ref: '#/components/schemas/SignalementCitoyenDto'},
				},
				meta: {
					type: 'object',
					properties: {
						total: {type: 'number', example: 100},
						page: {type: 'number', example: 1},
						limit: {type: 'number', example: 10},
						totalPages: {type: 'number', example: 10},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	findAll(@Query() searchDto: SearchSignalementCitoyenDto) {
		return this.signalementCitoyenService.findAll(searchDto);
	}

	@Get(':id')
	@ApiOperation({
		summary: 'Récupérer un signalement par son ID',
		description: "Retourne les détails complets d'un signalement spécifique",
	})
	@ApiParam({
		name: 'id',
		description: 'Identifiant unique du signalement',
		example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Signalement trouvé',
		type: SignalementCitoyenDto,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Signalement non trouvé',
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	findOne(@Param('id') id: string) {
		return this.signalementCitoyenService.findOne(id);
	}

	@Patch(':id')
	@UseGuards(JwtAuthGuard, AdminGuard)
	@UseInterceptors(
		FilesInterceptor('photo', 1, {
			dest: './uploads/tmp/signalements',
		}),
	)
	@ApiOperation({
		summary: 'Mettre à jour un signalement (Admin uniquement)',
		description:
			"Permet de modifier les informations d'un signalement existant. La validation nécessite les droits administrateur.",
	})
	@ApiConsumes('multipart/form-data')
	@ApiParam({
		name: 'id',
		description: 'Identifiant unique du signalement à modifier',
		example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				titre: {type: 'string'},
				description: {type: 'string'},
				categorieId: {type: 'string', format: 'uuid'},
				adresse: {type: 'string'},
				latitude: {type: 'number'},
				longitude: {type: 'number'},
				statut: {type: 'string', enum: ['NOUVEAU', 'EN_COURS', 'RESOLU', 'REJETE']},
				validation: {type: 'boolean', description: 'Nécessite les droits admin'},
				photo: {type: 'string', format: 'binary', description: 'Nouvelle photo du signalement'},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Signalement mis à jour avec succès',
		type: SignalementCitoyenDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Données invalides',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Signalement non trouvé',
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	@ApiResponse({
		status: HttpStatus.FORBIDDEN,
		description: 'Accès réservé aux administrateurs',
	})
	update(
		@Param('id') id: string,
		@Body() updateSignalementCitoyenDto: UpdateSignalementCitoyenDto,
		@UploadedFiles()
		files: Express.Multer.File[],
	) {
		return this.signalementCitoyenService.update(
			id,
			updateSignalementCitoyenDto,
			files,
		);
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, AdminGuard)
	@ApiOperation({
		summary: 'Supprimer un signalement (Admin uniquement)',
		description: 'Supprime définitivement un signalement (soft delete)',
	})
	@ApiParam({
		name: 'id',
		description: 'Identifiant unique du signalement à supprimer',
		example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Signalement supprimé avec succès',
		schema: {
			type: 'object',
			properties: {
				message: {
					type: 'string',
					example: 'Signalement supprimé avec succès',
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Signalement non trouvé',
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	@ApiResponse({
		status: HttpStatus.FORBIDDEN,
		description: 'Accès réservé aux administrateurs',
	})
	remove(@Param('id') id: string) {
		return this.signalementCitoyenService.remove(id);
	}
}
