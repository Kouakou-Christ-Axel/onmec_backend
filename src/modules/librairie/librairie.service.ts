import { BadRequestException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/services/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PDFParse } from 'pdf-parse';
import { SearchDocumentDto } from './dto/search-document.dto';
import { ConfigService } from '@nestjs/config';
import { DocumentResponseDto, PaginatedResponse, PublicDocumentResponseDto } from './dto/document-response.dto';
import { DocumentUploadKind, UploadDocumentRequestDto, UploadDocumentResponseDto } from './dto/upload-document.dto';
import { R2StorageService } from '../../common/services/r2-storage.service';

/** Durée de validité des URL présignées d'upload, en secondes. */
const UPLOAD_EXPIRES_IN = 300;

/** Extensions de couverture acceptées — plus restreint que les images générales. */
const ALLOWED_COVER_EXT = /\.(jpg|jpeg|png|webp)$/i;

@Injectable()
export class LibrairieService {
	private readonly logger = new Logger(LibrairieService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
		private readonly r2Service: R2StorageService,
	) {
	}

	/**
	 * Retourne l'URL de base du backend sans slash final, afin d'éviter les
	 * doubles slashes lorsqu'on la concatène avec un chemin (`/api/v1/...`).
	 * Ex: "https://admin.mec-ci.org/" -> "https://admin.mec-ci.org".
	 */
	private getBackendUrl(): string {
		const backendUrl = this.configService.get<string>('BACKEND_URL') ?? '';
		return backendUrl.replace(/\/+$/, '');
	}

	/**
	 * Génère une URL présignée pour le fichier PDF ou la couverture d'un document.
	 *
	 * La clé est construite sous `librairie/<documentId>/<fichier|cover><ext>`.
	 * `documentId` sert de dossier ET deviendra l'identifiant Prisma du document
	 * à la création — il est généré ici au premier appel (celui du fichier), et
	 * doit être repassé par le client lors du second appel (celui de la
	 * couverture) pour que les deux objets partagent le même dossier.
	 */
	async buildUploadUrl(dto: UploadDocumentRequestDto): Promise<UploadDocumentResponseDto> {
		const documentId = dto.documentId ?? randomUUID();
		const ext = extname(dto.filename);

		let baseName: string;
		if (dto.kind === DocumentUploadKind.FICHIER) {
			if (ext.toLowerCase() !== '.pdf') {
				throw new BadRequestException('Le document doit être un fichier PDF (.pdf)');
			}
			if (dto.contentType !== 'application/pdf') {
				throw new BadRequestException(
					`Le type MIME du document doit être application/pdf (reçu : ${dto.contentType || 'inconnu'})`,
				);
			}
			baseName = 'fichier';
		} else {
			if (!ALLOWED_COVER_EXT.test(dto.filename)) {
				throw new BadRequestException(
					'La couverture doit être une image jpg, jpeg, png ou webp',
				);
			}
			baseName = 'cover';
		}

		const key = `librairie/${documentId}/${baseName}${ext}`;
		const uploadUrl = await this.r2Service.getUploadUrl(key, dto.contentType, UPLOAD_EXPIRES_IN);

		return { key, uploadUrl, expiresIn: UPLOAD_EXPIRES_IN, documentId };
	}

	/**
	 * Extrait le dossier (= futur id Prisma) d'une clé R2 de la librairie, et
	 * vérifie qu'elle a bien la forme `librairie/<id>/<baseName><ext>` attendue
	 * pour le type demandé.
	 *
	 * Sans ce garde-fou, un client pourrait fournir une clé générée pour un
	 * autre module, ou une valeur arbitraire n'importe où dans le bucket.
	 */
	private parseLibrairieKey(key: string, baseName: 'fichier' | 'cover'): string {
		const parts = key.split('/');
		if (parts.length !== 3 || parts[0] !== 'librairie' || !parts[2].startsWith(baseName)) {
			throw new BadRequestException(
				`${baseName === 'fichier' ? 'fichierKey' : 'coverKey'} doit être une clé générée par POST /librairie/upload-url`,
			);
		}
		return parts[1];
	}

	async create(createLibrairieDto: CreateDocumentDto): Promise<DocumentResponseDto> {
		const documentId = this.parseLibrairieKey(createLibrairieDto.fichierKey, 'fichier');

		if (createLibrairieDto.coverKey) {
			const coverDocumentId = this.parseLibrairieKey(createLibrairieDto.coverKey, 'cover');
			if (coverDocumentId !== documentId) {
				throw new BadRequestException(
					'coverKey doit appartenir au même document que fichierKey',
				);
			}
		}

		const pageCount = await this.detectPageCount(createLibrairieDto.fichierKey);

		const document = await this.prisma.document.create({
			data: {
				id: documentId,
				title: createLibrairieDto.title,
				description: createLibrairieDto.description || null,
				categorie: createLibrairieDto.categorie || null,
				fileType: extname(createLibrairieDto.fichierKey),
				uploadedById: createLibrairieDto.userId,
				fileUrl: createLibrairieDto.fichierKey,
				coverImage: createLibrairieDto.coverKey ?? null,
				pageCount,
			},
			include: {
				uploadedBy: {
					select: {
						id: true,
						fullname: true,
						email: true,
					},
				},
			},
		});

		return this.documentToDto(document);
	}

	async findAll(search: SearchDocumentDto): Promise<PaginatedResponse<DocumentResponseDto>> {
		const {limit = 10, page = 1} = search;

		const where = {
			title: search.title
				? {contains: search.title, mode: 'insensitive' as const}
				: undefined,
			categorie: search.categorie ? {equals: search.categorie} : undefined,
		};

		// Récupérer le nombre total de documents
		const total = await this.prisma.document.count({where});

		// Récupérer les documents paginés
		const documents = await this.prisma.document.findMany({
			where,
			include: {
				uploadedBy: {
					select: {
						id: true,
						fullname: true,
						email: true,
					},
				},
			},
			orderBy: {
				uploadedAt: 'desc',
			},
			skip: (page - 1) * limit,
			take: limit,
		});

		const totalPages = Math.ceil(total / limit);

		return {
			data: documents.map(doc => this.documentToDto(doc)),
			meta: {
				total,
				page,
				limit,
				totalPages,
			},
		};
	}

	async findOne(id: string): Promise<DocumentResponseDto> {
		const document = await this.prisma.document.findUnique({
			where: {id},
			include: {
				uploadedBy: {
					select: {
						id: true,
						fullname: true,
						email: true,
					},
				},
			},
		});

		if (!document) {
			throw new NotFoundException(`Document avec l'ID ${id} non trouvé`);
		}

		return this.documentToDto(document);
	}

	async findAllPublic(search: SearchDocumentDto): Promise<PaginatedResponse<PublicDocumentResponseDto>> {
		const {limit = 10, page = 1} = search;

		const where = {
			title: search.title
				? {contains: search.title, mode: 'insensitive' as const}
				: undefined,
			categorie: search.categorie ? {equals: search.categorie} : undefined,
		};

		const total = await this.prisma.document.count({where});

		const documents = await this.prisma.document.findMany({
			where,
			include: {
				uploadedBy: {
					select: {fullname: true},
				},
			},
			orderBy: {uploadedAt: 'desc'},
			skip: (page - 1) * limit,
			take: limit,
		});

		const backendUrl = this.getBackendUrl();
		return {
			data: documents.map(doc => ({
				id: doc.id,
				title: doc.title,
				description: doc.description,
				categorie: doc.categorie,
				fileType: doc.fileType,
				fileUrl: `${backendUrl}/api/v1/librairie/${doc.id}/file`,
				coverImage: doc.coverImage ? this.r2Service.getPublicUrl(doc.coverImage) : null,
				pageCount: doc.pageCount,
				uploadedAt: doc.uploadedAt,
				auteur: doc.uploadedBy?.fullname ?? '',
			})),
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOnePublic(id: string): Promise<PublicDocumentResponseDto> {
		const document = await this.prisma.document.findUnique({
			where: {id},
			include: {
				uploadedBy: {
					select: {
						fullname: true,
					},
				},
			},
		});

		if (!document) {
			throw new NotFoundException(`Document avec l'ID ${id} non trouvé`);
		}

		const backendUrl = this.getBackendUrl();
		return {
			id: document.id,
			title: document.title,
			description: document.description,
			categorie: document.categorie,
			fileType: document.fileType,
			fileUrl: `${backendUrl}/api/v1/librairie/${document.id}/file`,
			coverImage: document.coverImage ? this.r2Service.getPublicUrl(document.coverImage) : null,
			pageCount: document.pageCount,
			uploadedAt: document.uploadedAt,
			auteur: document.uploadedBy?.fullname ?? '',
		};
	}

	/**
	 * Liste les catégories distinctes présentes sur les documents (hors null),
	 * triées alphabétiquement — pour alimenter les filtres côté application.
	 */
	async findCategories(): Promise<string[]> {
		const rows = await this.prisma.document.findMany({
			where: {categorie: {not: null}},
			distinct: ['categorie'],
			select: {categorie: true},
			orderBy: {categorie: 'asc'},
		});
		return rows
			.map((r) => r.categorie)
			.filter((c): c is string => !!c && c.trim().length > 0);
	}

	/** Redirige vers l'URL publique R2 du fichier, plutôt que de le streamer depuis le disque local. */
	async getFile(id: string): Promise<{ url: string; statusCode: number }> {
		const document = await this.prisma.document.findUnique({
			where: {id},
		});

		if (!document) {
			throw new NotFoundException(`Document avec l'ID ${id} non trouvé`);
		}

		if (!document.fileUrl) {
			throw new NotFoundException(
				`Aucun fichier associé au document avec l'ID ${id}`,
			);
		}

		return {url: this.r2Service.getPublicUrl(document.fileUrl), statusCode: HttpStatus.FOUND};
	}

	async update(id: string, updateLibrairieDto: UpdateDocumentDto): Promise<DocumentResponseDto> {
		const document = await this.prisma.document.findUnique({
			where: {id},
		});

		if (!document) {
			throw new NotFoundException(`Document avec l'ID ${id} non trouvé`);
		}

		const updatedDocument = await this.prisma.document.update({
			where: {id},
			data: {
				title: updateLibrairieDto.title ?? document.title,
				description: updateLibrairieDto.description ?? document.description,
				categorie: updateLibrairieDto.categorie ?? document.categorie,
			},
			include: {
				uploadedBy: {
					select: {
						id: true,
						fullname: true,
						email: true,
					},
				},
			},
		});

		return this.documentToDto(updatedDocument);
	}

	async remove(id: string) {
		const document = await this.prisma.document.findUnique({
			where: {id},
		});

		if (!document) {
			throw new NotFoundException(`Document avec l'ID ${id} non trouvé`);
		}

		if (document.fileUrl) {
			await this.deleteR2Object(document.fileUrl);
		}
		if (document.coverImage) {
			await this.deleteR2Object(document.coverImage);
		}

		// Supprimer le document de la base de données
		return this.prisma.document.delete({
			where: {id},
		});
	}

	/**
	 * Détecte le nombre de pages d'un PDF fraîchement uploadé sur R2.
	 * Best-effort : une erreur (réseau, PDF corrompu) ne doit pas faire
	 * échouer la création du document — on journalise et on retourne `null`.
	 */
	private async detectPageCount(fichierKey: string): Promise<number | null> {
		try {
			const buffer = await this.r2Service.getObjectBuffer(fichierKey);
			const parser = new PDFParse({ data: buffer });
			try {
				const info = await parser.getInfo();
				return info.total ?? null;
			} finally {
				await parser.destroy();
			}
		} catch (error) {
			this.logger.warn(
				`Impossible de détecter le nombre de pages pour ${fichierKey}: ${(error as Error).message}`,
			);
			return null;
		}
	}

	/** Suppression best-effort : l'échec ne doit pas faire échouer la requête. */
	private async deleteR2Object(key: string) {
		try {
			await this.r2Service.delete(key);
		} catch (error) {
			this.logger.warn(`Impossible de supprimer l'objet R2 ${key}: ${(error as Error).message}`);
		}
	}

	private documentToDto(document: any) {
		const id = document.id;
		const backendUrl = this.getBackendUrl();
		return {
			id,
			title: document.title,
			description: document.description,
			categorie: document.categorie,
			fileType: document.fileType,
			fileUrl: `${backendUrl}/api/v1/librairie/${id}/file`,
			coverImage: document.coverImage ? this.r2Service.getPublicUrl(document.coverImage) : null,
			pageCount: document.pageCount,
			uploadedAt: document.uploadedAt,
			uploadedBy: {
				id: document.uploadedBy.id,
				fullname: document.uploadedBy.fullname,
				email: document.uploadedBy.email,
			},
		};
	}
}
