import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {CreateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/create-signalement-citoyen.dto';
import {UpdateSignalementCitoyenDto} from './dto/signalement-citoyen-dto/update-signalement-citoyen.dto';
import {SearchSignalementCitoyenDto} from './dto/signalement-citoyen-dto/search-signalement-citoyen.dto';
import {PrismaService} from '../../database/services/prisma.service';
import {promises as fs} from 'fs';
import * as path from 'path';
import {PaginatedResponse} from './dto/signalement-citoyen-dto/paginated-response.dto';
import {StatutSignalement} from "@prisma/client";

@Injectable()
export class SignalementCitoyenService {
	private readonly uploadDir = path.join(process.cwd(), 'uploads', 'signalements');

	constructor(private readonly prisma: PrismaService) {
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
	async findAll(searchDto: SearchSignalementCitoyenDto): Promise<PaginatedResponse<any>> {
		const {titre, categorieId, statut, latitude, longitude, citoyenId, page = 1, limit = 10} = searchDto;
		const where: any = {};

		if (titre) where.titre = {contains: titre, mode: 'insensitive'};
		if (categorieId) where.categorieId = categorieId;
		if (statut) where.statut = statut;
		if (latitude && longitude) {
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

		return {
			data: signalements,
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
	async findOne(id: string) {
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
		return signalement;
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
