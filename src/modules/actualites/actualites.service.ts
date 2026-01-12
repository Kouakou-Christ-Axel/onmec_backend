import {Injectable, NotFoundException} from '@nestjs/common';
import {CreateActualiteDto} from './dto/create-actualite.dto';
import {UpdateActualiteDto} from './dto/update-actualite.dto';
import {PrismaService} from 'src/database/services/prisma.service';
import slugify from '../../../utils/slugify';
import {ActualitesSearchDto} from './dto/actualites-search.dto';
import {Prisma} from '@prisma/client';
import {ActualiteEntity} from "./entities/actualite.entity";
import {ConfigService} from '@nestjs/config';


@Injectable()
export class ActualitesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
	) {
	}

	/**
	 * Génère un slug unique en ajoutant un suffixe aléatoire si nécessaire
	 * @param title - Le titre à slugifier
	 * @param excludeId - ID à exclure de la vérification (pour les mises à jour)
	 */
	private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
		let slug = slugify(title);

		let existingActualite = await this.prisma.actualite.findUnique({
			where: {slug},
		});

		while (existingActualite && existingActualite.id !== excludeId) {
			const randomSuffix = `-${Math.random().toString(36).substring(2, 8)}`;
			slug = slugify(title, randomSuffix);
			existingActualite = await this.prisma.actualite.findUnique({
				where: {slug},
			});
		}

		return slug;
	}

	async create(createActualiteDto: CreateActualiteDto, image?: Express.Multer.File) {
		const slug = await this.generateUniqueSlug(createActualiteDto.title);

		return await this.prisma.actualite.create({
			data: {
				...createActualiteDto,
				slug,
				imageUrl: image ? `/uploads/actualites/${image.filename}` : null,
			},
		});
	}

	async findAll(query?: ActualitesSearchDto) {
		const page = query?.page ?? 1;
		const limit = query?.limit ?? 10;
		const skip = (page - 1) * limit;

		const where: Prisma.ActualiteWhereInput = {};

		if (query?.search) {
			where.OR = [
				{
					content: {
						search: query?.search,
					},
				},
				{
					title: {
						search: query?.search,
					},
				},
				{
					excerpt: {
						search: query?.search,
					},
				}
			];
		}

		if (query?.dateFrom || query?.dateTo) {
			where.date = {};
			if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
			if (query.dateTo) where.date.lte = new Date(query.dateTo);
		}

		if (query?.hasImage !== undefined) {
			if (query.hasImage) {
				where.imageUrl = {not: null};
			} else {
				where.imageUrl = null;
			}
		}

		const [data, total] = await this.prisma.$transaction([
			this.prisma.actualite.findMany({
				where: Object.keys(where).length ? where : undefined,
				orderBy: {date: 'desc'},
				skip,
				take: limit,
			}),
			this.prisma.actualite.count({where: Object.keys(where).length ? where : undefined}),
		]);

		const mappedData = data.map(item => this.mapToEntity(item));

		return {
			data: mappedData,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit) || 1,
			},
		};
	}

	async findOne(id: string) {
		const actualite = await this.prisma.actualite.findUnique({
			where: {id},
		});

		if (!actualite) {
			throw new NotFoundException(`Actualité avec l'ID ${id} non trouvée`);
		}

		return this.mapToEntity(actualite);
	}

	async findBySlug(slug: string) {
		const actualite = await this.prisma.actualite.findUnique({
			where: {slug},
		});

		if (!actualite) {
			throw new NotFoundException(`Actualité avec le slug ${slug} non trouvée`);
		}

		return this.mapToEntity(actualite);
	}

	async update(id: string, updateActualiteDto: UpdateActualiteDto, image?: Express.Multer.File) {
		// Vérifier si l'actualité existe
		const actualite = await this.prisma.actualite.findUnique({
			where: {id},
		});

		if (!actualite) {
			throw new NotFoundException(`Actualité avec l'ID ${id} non trouvée`);
		}

		const updateData: any = {...updateActualiteDto};

		// Si une nouvelle image est uploadée
		if (image) {
			updateData.imageUrl = `/uploads/actualites/${image.filename}`;
		}

		// Si le titre est modifié, générer un nouveau slug unique
		if (updateActualiteDto.title) {
			updateData.slug = await this.generateUniqueSlug(updateActualiteDto.title, id);
		}

		const updated = await this.prisma.actualite.update({
			where: {id},
			data: updateData,
		});
		return this.mapToEntity(updated);
	}

	async remove(id: string) {
		// Vérifier si l'actualité existe
		const actualite = await this.prisma.actualite.findUnique({
			where: {id},
		});

		if (!actualite) {
			throw new NotFoundException(`Actualité avec l'ID ${id} non trouvée`);
		}

		return await this.prisma.actualite.delete({
			where: {id},
		});
	}

	private mapToEntity(actualite: any): ActualiteEntity {
		const entity = new ActualiteEntity();
		Object.assign(entity, actualite);
		return this.addCdnUrl(entity);
	}

	private addCdnUrl(actualite: ActualiteEntity) {
		if (!actualite.imageUrl) return actualite;
		const cdnUrl = this.configService.get<string>('CDN_URL') || '';
		return {
			...actualite,
			imageUrl: `${cdnUrl}${actualite.imageUrl}`,
		};
	}
}
