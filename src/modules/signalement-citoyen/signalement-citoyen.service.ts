import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {CreateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/create-signalement-citoyen.dto';
import {UpdateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/update-signalement-citoyen.dto';
import {SearchSignalementCitoyenDto} from './dto/signalement-citoyen-dto/search-signalement-citoyen.dto';
import {PrismaService} from '../../database/services/prisma.service';
import {promises as fs} from 'fs';
import * as path from 'path';
import {PaginatedResponse} from './dto/signalement-citoyen-dto/paginated-response.dto';
import {StatutSignalement} from "@prisma/client";
import {EngagementService} from '../engagement/engagement.service';

@Injectable()
export class SignalementCitoyenService {
	private readonly uploadDir = path.join(process.cwd(), 'uploads', 'signalements');

	constructor(
		private readonly prisma: PrismaService,
		private readonly engagementService: EngagementService,
	) {
	}

	/**
	 * Enrichit un signalement avec ses statistiques d'engagement
	 * (likesCount, commentsCount, likedByMe).
	 */
	private async withEngagement<T extends {id: string}>(signalement: T, userId?: string): Promise<T & {likesCount: number; commentsCount: number; likedByMe: boolean}> {
		const stats = await this.engagementService.getEngagementStats('signalement', [signalement.id], userId);
		const entry = stats.get(signalement.id) ?? {likesCount: 0, commentsCount: 0, likedByMe: false};
		return {...signalement, ...entry};
	}

	/**
	 * Traite et sauvegarde un fichier photo
	 * @param photoFile - Fichier Express.Multer.File
	 * @returns L'URL relative du fichier sauvegardé ou null
	 */
	private async processPhotoFile(photoFile: Express.Multer.File): Promise<string | null> {
		if (!photoFile) {
			return null;
		}

		try {
			// Créer le répertoire s'il n'existe pas
			await fs.mkdir(this.uploadDir, {recursive: true});

			// Générer un nom de fichier unique
			const timestamp = Date.now();
			const fileExt = this.getFileExtension(photoFile.originalname);
			const fileName = `signalement-${timestamp}${fileExt}`;
			const filePath = path.join(this.uploadDir, fileName);

			// Déplacer le fichier du répertoire temporaire au répertoire final
			await fs.rename(photoFile.path, filePath);

			// Retourner le chemin relatif
			return `/uploads/signalements/${fileName}`;
		} catch (error) {
			throw new BadRequestException(
				`Erreur lors du traitement de la photo: ${error.message}`,
			);
		}
	}

	/**
	 * Supprime une photo existante
	 * @param photoPath - Chemin relatif de la photo à supprimer
	 */
	private async deletePhotoFile(photoPath: string | null): Promise<void> {
		if (!photoPath) {
			return;
		}

		try {
			const fullPath = path.join(process.cwd(), photoPath);
			await fs.unlink(fullPath);
		} catch (error) {
			console.warn(`Impossible de supprimer la photo: ${error.message}`);
		}
	}

	/**
	 * Extrait l'extension d'un nom de fichier
	 * @param filename - Nom du fichier
	 * @returns Extension du fichier (ex: .jpg)
	 */
	private getFileExtension(filename: string): string {
		return path.extname(filename);
	}

	/**
	 * Crée un nouveau signalement citoyen
	 * @param createSignalementCitoyenDto - Données du signalement
	 * @param files - Fichiers uploadés (tableau)
	 */
	async create(
		createSignalementCitoyenDto: CreateSignalementCitoyenDto,
		files?: Express.Multer.File[],
	) {
		try {
			// Traiter le fichier photo s'il y en a
			const photoUrl = files && files.length > 0
				? await this.processPhotoFile(files[0])
				: null;

			// Créer le signalement avec la photo
			return await this.prisma.signalementCitoyen.create({
				data: {
					...createSignalementCitoyenDto,
					statut: StatutSignalement.NOUVEAU,
					photo: photoUrl,
				},
				include: {
					categorie: true,
					citoyen: {
						select: {
							id: true,
							fullname: true,
							email: true,
						},
					},
				},
			});
		} catch (error) {
			// Nettoyer les fichiers uploadés en cas d'erreur
			if (files && files.length > 0) {
				await this.deletePhotoFile(files[0].path);
			}
			throw new BadRequestException(
				`Erreur lors de la création du signalement: ${error.message}`,
			);
		}
	}

	/**
	 * Récupère tous les signalements avec pagination et filtres
	 */
	async findAll(searchDto: SearchSignalementCitoyenDto, userId?: string): Promise<PaginatedResponse<any>> {
		const {titre, search, categorieId, statut, latitude, longitude, radiusKm, citoyenId, page = 1, limit = 10} = searchDto;
		const where: any = {};

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
				include: {
					categorie: true,
					citoyen: {
						select: {
							id: true,
							fullname: true,
							email: true,
						},
					},
				},
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

		let data = signalements.map((s) => ({
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
	 * Récupère les signalements d'un citoyen donné (paginés).
	 *
	 * Contrairement à findAll qui sert de flux/carte publique de l'ensemble des
	 * signalements, cette route ne renvoie que les signalements dont l'auteur est
	 * `citoyenId`. Elle est utilisée notamment par l'écran profil de l'app mobile
	 * pour afficher « Mes signalements » et le compteur associé.
	 *
	 * @param citoyenId - Identifiant du citoyen auteur des signalements
	 * @param page - Numéro de page (défaut 1)
	 * @param limit - Taille de page (défaut 10)
	 * @param userId - Identifiant du visiteur connecté (pour likedByMe)
	 */
	async findByCitoyen(
		citoyenId: string,
		page = 1,
		limit = 10,
		userId?: string,
	): Promise<PaginatedResponse<any>> {
		const where = {citoyenId};

		const [total, signalements] = await Promise.all([
			this.prisma.signalementCitoyen.count({where}),
			this.prisma.signalementCitoyen.findMany({
				where,
				include: {
					categorie: true,
					citoyen: {
						select: {
							id: true,
							fullname: true,
							email: true,
						},
					},
				},
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

		const data = signalements.map((s) => ({
			...s,
			...(stats.get(s.id) ?? {likesCount: 0, commentsCount: 0, likedByMe: false}),
		}));

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
			include: {
				categorie: true,
				citoyen: {
					select: {
						id: true,
						fullname: true,
						email: true,
					},
				},
			},
		});
		if (!signalement) {
			throw new NotFoundException(
				`Signalement citoyen avec l'id ${id} introuvable`,
			);
		}
		return this.withEngagement(signalement, userId);
	}

	/**
	 * Met à jour un signalement existant
	 * @param id - ID du signalement à mettre à jour
	 * @param updateSignalementCitoyenDto - Données à mettre à jour
	 * @param files - Fichiers uploadés (tableau)
	 */
	async update(
		id: string,
		updateSignalementCitoyenDto: UpdateSignalementCitoyenDto,
		files?: Express.Multer.File[],
	) {
		const signalement = await this.prisma.signalementCitoyen.findUnique({
			where: {id},
		});

		if (!signalement) {
			throw new NotFoundException(
				`Signalement citoyen avec l'id ${id} introuvable`,
			);
		}

		try {
			let photoUrl: string | null = null;

			// Traiter le nouveau fichier photo s'il y en a
			if (files && files.length > 0) {
				photoUrl = await this.processPhotoFile(files[0]);

				// Supprimer l'ancienne photo si elle existe
				if (signalement.photo) {
					await this.deletePhotoFile(signalement.photo);
				}
			}

			return await this.prisma.signalementCitoyen.update({
				where: {id},
				data: {
					...updateSignalementCitoyenDto,
					...(photoUrl !== null && {photo: photoUrl}),
				},
				include: {
					categorie: true,
					citoyen: {
						select: {
							id: true,
							fullname: true,
							email: true,
						},
					},
				},
			});
		} catch (error) {
			// Nettoyer les fichiers uploadés en cas d'erreur
			if (files && files.length > 0) {
				await this.deletePhotoFile(files[0].path);
			}
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
			await this.deletePhotoFile(signalement.photo);
		}

		return await this.prisma.signalementCitoyen.delete({where: {id}});
	}
}
