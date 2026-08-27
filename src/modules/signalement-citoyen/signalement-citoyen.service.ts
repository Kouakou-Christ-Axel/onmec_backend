import {BadRequestException, Injectable, Logger, NotFoundException} from '@nestjs/common';
import {CreateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/create-signalement-citoyen.dto';
import {UpdateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/update-signalement-citoyen.dto';
import {SearchSignalementCitoyenDto} from './dto/signalement-citoyen-dto/search-signalement-citoyen.dto';
import {UploadSignalementPhotoResponseDto} from './dto/signalement-citoyen-dto/upload-signalement-photo.dto';
import {PrismaService} from '../../database/services/prisma.service';
import {PaginatedResponseDto} from '../../common/dto/paginated-response.dto';
import {PointSource, StatutSignalement} from "../../generated/prisma/client";
import {EngagementService} from '../engagement/engagement.service';
import {GamificationService} from '../gamification/gamification.service';
import {BAREME} from '../gamification/points-bareme';
import {
	NOTIFICATION_TYPE,
	NotificationService,
} from '../notification/notification.service';
import {R2StorageService} from '../../common/services/r2-storage.service';

/** Relations chargées avec chaque signalement renvoyé au client. */
const SIGNALEMENT_INCLUDE = {
	categorie: true,
	citoyen: {
		select: {
			id: true,
			fullname: true,
			email: true,
		},
	},
} as const;

@Injectable()
export class SignalementCitoyenService {
	private readonly logger = new Logger(SignalementCitoyenService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly engagementService: EngagementService,
		private readonly gamification: GamificationService,
		private readonly notifications: NotificationService,
		private readonly r2Service: R2StorageService,
	) {
	}

	/**
	 * Refuse une `photoKey` qui ne pointe pas vers le dossier des signalements.
	 *
	 * Sans ce garde-fou, un client pourrait fournir la clé générée pour un
	 * autre module (actualités, librairie, avatars…), ou une valeur
	 * arbitraire n'importe où dans le bucket.
	 */
	private assertPhotoKey(photoKey?: string) {
		if (photoKey === undefined) return;
		if (!photoKey.startsWith('signalements/')) {
			throw new BadRequestException(
				"photoKey doit être une clé générée par POST /signalement-citoyen/upload-url",
			);
		}
	}

	/**
	 * Extrait la clé objet R2 depuis la valeur stockée en base, si elle en a
	 * la forme.
	 *
	 * Les signalements créés avant cette migration portent encore un chemin
	 * `/uploads/signalements/...` ; certains peuvent même porter une valeur
	 * antérieure non reconnaissable. Dans les deux cas, on ignore la
	 * suppression plutôt que d'échouer : une photo déjà remplacée en base ne
	 * doit jamais faire échouer la requête à cause d'un objet R2 orphelin ou
	 * inexistant.
	 */
	private extractPhotoKey(photo: string): string | null {
		const key = photo.replace(/^\/?uploads\//, '');
		return key.startsWith('signalements/') ? key : null;
	}

	/** Suppression best-effort : l'échec ne doit pas faire échouer la requête. */
	private async deleteOldPhoto(photo: string) {
		const key = this.extractPhotoKey(photo);
		if (!key) return;

		try {
			await this.r2Service.delete(key);
		} catch (error) {
			this.logger.warn(
				`Impossible de supprimer la photo R2 ${key}: ${(error as Error).message}`,
			);
		}
	}

	/** Remplace la clé R2 stockée par son URL publique dans une réponse. */
	private mapSignalement<T extends {photo?: string | null}>(signalement: T): T {
		if (!signalement.photo) return signalement;
		return {...signalement, photo: this.r2Service.getPublicUrl(signalement.photo)};
	}

	/** Génère une URL présignée pour la photo d'un signalement. */
	buildPhotoUploadUrl(
		filename: string,
		contentType: string,
	): Promise<UploadSignalementPhotoResponseDto> {
		return this.r2Service.presignImage('signalements', filename, contentType);
	}

	/**
	 * Crée un nouveau signalement citoyen
	 * @param createSignalementCitoyenDto - Données du signalement, avec une
	 *   éventuelle photoKey R2 obtenue via POST /signalement-citoyen/upload-url
	 */
	async create(createSignalementCitoyenDto: CreateSignalementCitoyenDto) {
		this.assertPhotoKey(createSignalementCitoyenDto.photoKey);

		try {
			const {photoKey, ...data} = createSignalementCitoyenDto;

			// Créer le signalement avec la photo
			const signalement = await this.prisma.signalementCitoyen.create({
				data: {
					...data,
					statut: StatutSignalement.NOUVEAU,
					photo: photoKey ?? null,
				},
				include: SIGNALEMENT_INCLUDE,
			});

			// Un signalement peut être anonyme : pas de citoyen, donc personne à
			// créditer.
			if (signalement.citoyenId) {
				await this.gamification.attribuer({
					userId: signalement.citoyenId,
					source: PointSource.SIGNALEMENT_DEPOSE,
					sourceId: signalement.id,
					points: BAREME.SIGNALEMENT_DEPOSE,
					raison: 'signalement depose',
				});
			}

			return this.mapSignalement(signalement);
		} catch (error) {
			throw new BadRequestException(
				`Erreur lors de la création du signalement: ${error.message}`,
			);
		}
	}

	/**
	 * Récupère tous les signalements avec pagination et filtres.
	 *
	 * @param searchDto - Critères de recherche/filtre et pagination
	 * @param userId - Visiteur connecté (pour likedByMe)
	 * @param onlyValidated - Si vrai, ne renvoie que les signalements validés
	 *   (validation = true). Utilisé par le flux mobile, qui ne doit afficher que
	 *   les signalements validés par le back-office.
	 */
	async findAll(searchDto: SearchSignalementCitoyenDto, userId?: string, onlyValidated = false): Promise<PaginatedResponseDto<any>> {
		const {titre, search, categorieId, statut, latitude, longitude, radiusKm, citoyenId, page = 1, limit = 10} = searchDto;
		const where: any = {};

		if (onlyValidated) where.validation = true;
		if (titre) where.titre = {contains: titre, mode: 'insensitive'};

		// Recherche par mot-clé côté serveur : filtre insensible à la casse et en
		// correspondance partielle (LIKE %term%) sur le titre, la description,
		// l'adresse et le nom de la catégorie. Si « search » est absent ou vide,
		// le comportement reste inchangé (rétro-compatibilité).
		const searchTerm = search?.trim();
		if (searchTerm) {
			where.OR = [
				{titre: {contains: searchTerm, mode: 'insensitive'}},
				{description: {contains: searchTerm, mode: 'insensitive'}},
				{adresse: {contains: searchTerm, mode: 'insensitive'}},
				{categorie: {is: {nom: {contains: searchTerm, mode: 'insensitive'}}}},
			];
		}
		if (categorieId) where.categorieId = categorieId;
		if (statut) where.statut = statut;
		// Recherche géographique « autour de » : si un rayon est fourni avec des
		// coordonnées, on filtre via une boîte englobante (bounding box) puis on
		// trie le résultat par distance réelle (Haversine). Sans rayon, on
		// conserve l'ancien comportement (égalité exacte) pour rétro-compatibilité.
		const useRadius =
			latitude !== undefined && longitude !== undefined && radiusKm !== undefined && radiusKm > 0;
		if (useRadius) {
			const latDelta = radiusKm! / 111.0;
			const lngDelta = radiusKm! / (111.32 * Math.cos((latitude! * Math.PI) / 180) || 1);
			where.latitude = {gte: latitude! - latDelta, lte: latitude! + latDelta};
			where.longitude = {gte: longitude! - lngDelta, lte: longitude! + lngDelta};
		} else if (latitude && longitude) {
			where.latitude = latitude;
			where.longitude = longitude;
		}
		if (citoyenId) where.citoyenId = citoyenId;

		const [total, signalements] = await Promise.all([
			this.prisma.signalementCitoyen.count({where}),
			await this.prisma.signalementCitoyen.findMany({
				where,
				include: SIGNALEMENT_INCLUDE,
				orderBy: {
					createdAt: 'desc',
				},
				skip: (page - 1) * limit,
				take: limit,
			}),
		]);

		const totalPages = Math.ceil(total / limit);

		const stats = await this.engagementService.getEngagementStats(
			'signalement',
			signalements.map((s) => s.id),
			userId,
		);

		let data = signalements.map((s) => this.mapSignalement({
			...s,
			...(stats.get(s.id) ?? {likesCount: 0, commentsCount: 0, likedByMe: false}),
		}));

		// Tri par distance réelle du plus proche au plus éloigné lorsqu'une
		// recherche par rayon est demandée.
		if (useRadius) {
			const toRad = (deg: number) => (deg * Math.PI) / 180;
			const distanceKm = (lat: number, lng: number) => {
				const R = 6371;
				const dLat = toRad(lat - latitude!);
				const dLng = toRad(lng - longitude!);
				const a =
					Math.sin(dLat / 2) ** 2 +
					Math.cos(toRad(latitude!)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
				return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			};
			data = data.sort(
				(a, b) =>
					distanceKm(Number(a.latitude), Number(a.longitude)) -
					distanceKm(Number(b.latitude), Number(b.longitude)),
			);
		}

		return {
			data,
			meta: {
				total,
				page,
				limit,
				totalPages,
			},
		};
	}

	/**
	 * Récupère un signalement par son ID
	 */
	async findOne(id: string, userId?: string) {
		const signalement = await this.prisma.signalementCitoyen.findUnique({
			where: {id},
			include: SIGNALEMENT_INCLUDE,
		});
		if (!signalement) {
			throw new NotFoundException(
				`Signalement citoyen avec l'id ${id} introuvable`,
			);
		}

		// Enrichit le signalement avec ses statistiques d'engagement
		// (likesCount, commentsCount, likedByMe).
		const stats = await this.engagementService.getEngagementStats('signalement', [signalement.id], userId);
		const entry = stats.get(signalement.id) ?? {likesCount: 0, commentsCount: 0, likedByMe: false};

		return this.mapSignalement({...signalement, ...entry});
	}

	/**
	 * Met à jour un signalement existant
	 * @param id - ID du signalement à mettre à jour
	 * @param updateSignalementCitoyenDto - Données à mettre à jour, avec une
	 *   éventuelle nouvelle photoKey R2
	 */
	async update(
		id: string,
		updateSignalementCitoyenDto: UpdateSignalementCitoyenDto,
	) {
		this.assertPhotoKey(updateSignalementCitoyenDto.photoKey);

		const signalement = await this.prisma.signalementCitoyen.findUnique({
			where: {id},
		});

		if (!signalement) {
			throw new NotFoundException(
				`Signalement citoyen avec l'id ${id} introuvable`,
			);
		}

		try {
			const {photoKey, ...data} = updateSignalementCitoyenDto;

			const misAJour = await this.prisma.signalementCitoyen.update({
				where: {id},
				data: {
					...data,
					...(photoKey !== undefined && {photo: photoKey}),
				},
				include: SIGNALEMENT_INCLUDE,
			});

			// L'ancien objet R2 n'etait jamais supprime : chaque remplacement de
			// photo laissait un orphelin definitif dans le bucket.
			if (photoKey !== undefined && signalement.photo) {
				await this.deleteOldPhoto(signalement.photo);
			}

			// Bonus de validation : verse au passage de `validation` a vrai, et
			// une seule fois. Le sourceId etant le signalement, devalider puis
			// revalider ne recredite pas.
			const vientDEtreValide = !signalement.validation && misAJour.validation;
			if (vientDEtreValide && misAJour.citoyenId) {
				await this.gamification.attribuer({
					userId: misAJour.citoyenId,
					source: PointSource.SIGNALEMENT_VALIDE,
					sourceId: misAJour.id,
					points: BAREME.SIGNALEMENT_VALIDE,
					raison: 'signalement valide',
				});
			}

			// Notification adossee au CHANGEMENT et non a l'appel : le
			// back-office edite un signalement pour bien d'autres raisons
			// (correction d'adresse, ajout de photo), et prevenir le citoyen a
			// chaque enregistrement rendrait la notification insignifiante.
			const statutChange = signalement.statut !== misAJour.statut;
			if ((statutChange || vientDEtreValide) && misAJour.citoyenId) {
				await this.notifications.notifierMembre(misAJour.citoyenId, {
					type: NOTIFICATION_TYPE.SIGNALEMENT_STATUT,
					title: 'Votre signalement a été mis à jour',
					body: vientDEtreValide
						? `« ${misAJour.titre} » a été validé.`
						: `« ${misAJour.titre} » est désormais au statut ${misAJour.statut}.`,
					lien: `/signalements/${misAJour.id}`,
				});
			}

			return this.mapSignalement(misAJour);
		} catch (error) {
			throw new BadRequestException(
				`Erreur lors de la mise à jour du signalement: ${error.message}`,
			);
		}
	}

	/**
	 * Supprime un signalement et sa photo associée
	 */
	async remove(id: string) {
		const signalement = await this.prisma.signalementCitoyen.findUnique({
			where: {id},
		});

		if (!signalement) {
			throw new NotFoundException(
				`Signalement citoyen avec l'id ${id} introuvable`,
			);
		}

		// Supprimer la photo si elle existe
		if (signalement.photo) {
			await this.deleteOldPhoto(signalement.photo);
		}

		return await this.prisma.signalementCitoyen.delete({where: {id}});
	}
}
