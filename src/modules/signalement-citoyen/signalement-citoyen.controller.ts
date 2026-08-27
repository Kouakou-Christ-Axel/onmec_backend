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
	UseGuards,
} from '@nestjs/common';
import {SignalementCitoyenService} from './signalement-citoyen.service';
import {CreateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/create-signalement-citoyen.dto';
import {UpdateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/update-signalement-citoyen.dto';
import {
	UploadSignalementPhotoRequestDto,
	UploadSignalementPhotoResponseDto,
} from './dto/signalement-citoyen-dto/upload-signalement-photo.dto';
import {Request} from 'express';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import {SearchSignalementCitoyenDto} from './dto/signalement-citoyen-dto/search-signalement-citoyen.dto';
import {ApiBearerAuth, ApiBody, ApiExtraModels, ApiOkResponse, ApiOperation, ApiParam, ApiResponse, ApiTags,} from '@nestjs/swagger';
import {SignalementCitoyenDto} from './dto/signalement-citoyen-dto/signalement-citoyen.dto';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {OptionalJwtAuthGuard} from '../auth/guards/optional-jwt-auth.guard';
import {AdminGuard} from '../auth/guards/admin.guard';
import {PaginatedResponseDto} from '../../common/dto/paginated-response.dto';

@ApiTags('Signalement Citoyen')
@ApiBearerAuth('JWT')
@ApiExtraModels(PaginatedResponseDto)
@Controller('signalement-citoyen')
export class SignalementCitoyenController {
	constructor(
		private readonly signalementCitoyenService: SignalementCitoyenService,
	) {
	}

	@Post('upload-url')
	@UseGuards(JwtAuthGuard)
	@ApiOperation({
		summary: 'Demander une URL présignée pour la photo d’un signalement',
		description:
			"Génère une clé d'objet sous signalements/ et une URL PUT présignée. Le client envoie ensuite le fichier directement à R2, puis fournit la clé retournée en photoKey à POST /signalement-citoyen ou PATCH /signalement-citoyen/:id.",
	})
	@ApiBody({type: UploadSignalementPhotoRequestDto})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: 'URL présignée générée',
		type: UploadSignalementPhotoResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	async uploadPhotoUrl(@Body() dto: UploadSignalementPhotoRequestDto) {
		return this.signalementCitoyenService.buildPhotoUploadUrl(
			dto.filename,
			dto.contentType,
		);
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	@ApiOperation({
		summary: 'Créer un nouveau signalement citoyen',
		description:
			'Permet à un citoyen authentifié de créer un signalement pour un problème rencontré dans sa ville, à partir d’une clé de photo déjà uploadée sur R2 (optionnelle).',
	})
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
	) {
		const user = req.user as AuthenticatedActor;
		createSignalementCitoyenDto.citoyenId = user.id;
		return this.signalementCitoyenService.create(createSignalementCitoyenDto);
	}

	@Get()
	@ApiOperation({
		summary: 'Récupérer tous les signalements',
		description:
			'Retourne une liste paginée de signalements avec possibilité de filtrer par différents critères',
	})
	@ApiOkResponse({
		description: 'Liste des signalements récupérée avec succès',
		schema: {
			allOf: [
				{$ref: '#/components/schemas/PaginatedResponseDto'},
				{properties: {data: {type: 'array', items: {$ref: '#/components/schemas/SignalementCitoyenDto'}}}},
			],
		},
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	@UseGuards(OptionalJwtAuthGuard)
	findAll(@Query() searchDto: SearchSignalementCitoyenDto, @Req() req: Request) {
		const user = req.user as AuthenticatedActor | undefined;
		return this.signalementCitoyenService.findAll(searchDto, user?.id);
	}

	@Get('me')
	@ApiOperation({
		summary: "Récupérer les signalements de l'utilisateur connecté",
		description:
			"Retourne la liste paginée des signalements créés par l'utilisateur authentifié. L'identifiant du citoyen est déduit du JWT. Utilisé par l'écran profil pour n'afficher que les signalements de l'utilisateur.",
	})
	@ApiOkResponse({
		description: 'Liste des signalements du citoyen récupérée avec succès',
		schema: {
			allOf: [
				{$ref: '#/components/schemas/PaginatedResponseDto'},
				{properties: {data: {type: 'array', items: {$ref: '#/components/schemas/SignalementCitoyenDto'}}}},
			],
		},
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: 'Non authentifié',
	})
	@UseGuards(JwtAuthGuard)
	// `@Query('page')` plutot qu'un DTO type : le handler a toujours ignore en
	// silence les parametres inconnus et les valeurs non numeriques. Passer par
	// SearchSignalementCitoyenDto les ferait tomber sur le `forbidNonWhitelisted`
	// global, donc en 400 — une regression pour les clients deja deployes.
	findMine(
		@Query('page') page: string,
		@Query('limit') limit: string,
		@Req() req: Request,
	) {
		const user = req.user as AuthenticatedActor;
		return this.signalementCitoyenService.findAll(
			{
				citoyenId: user.id,
				page: Number(page) > 0 ? Number(page) : 1,
				limit: Number(limit) > 0 ? Number(limit) : 10,
			},
			user.id,
		);
	}

	@Get('mobile')
	@ApiOperation({
		summary: 'Flux mobile : signalements validés uniquement',
		description:
			"Retourne une liste paginée des signalements VALIDÉS (validation = true), destinée à l'application mobile. Supporte les mêmes filtres que GET / (recherche, catégorie, statut, rayon géographique) et la pagination pour le défilement infini.",
	})
	@ApiOkResponse({
		description: 'Liste des signalements validés récupérée avec succès',
		schema: {
			allOf: [
				{$ref: '#/components/schemas/PaginatedResponseDto'},
				{properties: {data: {type: 'array', items: {$ref: '#/components/schemas/SignalementCitoyenDto'}}}},
			],
		},
	})
	@UseGuards(OptionalJwtAuthGuard)
	findAllMobile(@Query() searchDto: SearchSignalementCitoyenDto, @Req() req: Request) {
		const user = req.user as AuthenticatedActor | undefined;
		return this.signalementCitoyenService.findAll(searchDto, user?.id, true);
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
	@UseGuards(OptionalJwtAuthGuard)
	findOne(@Param('id') id: string, @Req() req: Request) {
		const user = req.user as AuthenticatedActor | undefined;
		return this.signalementCitoyenService.findOne(id, user?.id);
	}

	@Patch(':id')
	@UseGuards(JwtAuthGuard, AdminGuard)
	@ApiOperation({
		summary: 'Mettre à jour un signalement (Admin uniquement)',
		description:
			"Permet de modifier les informations d'un signalement existant, y compris sa photo via une clé R2 déjà uploadée. La validation nécessite les droits administrateur.",
	})
	@ApiParam({
		name: 'id',
		description: 'Identifiant unique du signalement à modifier',
		example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
	})
	@ApiBody({type: UpdateSignalementCitoyenDto})
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
	) {
		return this.signalementCitoyenService.update(
			id,
			updateSignalementCitoyenDto,
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
