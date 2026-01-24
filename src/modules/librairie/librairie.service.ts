import {BadRequestException, Injectable, NotFoundException, StreamableFile,} from '@nestjs/common';
import {PrismaService} from '../../database/services/prisma.service';
import {CreateDocumentDto, DocumentFilesDto} from './dto/create-document.dto';
import {UpdateDocumentDto} from './dto/update-document.dto';
import {createReadStream, promises as fs} from 'fs';
import * as path from 'path';
import {join} from 'path';
import {SearchDocumentDto} from './dto/search-document.dto';
import {ConfigService} from "@nestjs/config";
import {DocumentResponseDto, PaginatedResponse} from './dto/document-response.dto';

@Injectable()
export class LibrairieService {
	private readonly uploadDir = path.join(process.cwd(), 'uploads', 'librairie');

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
	) {
	}

	async create(createLibrairieDto: CreateDocumentDto, files: DocumentFilesDto): Promise<DocumentResponseDto> {
		const {fichiers, covers} = files;
		const fichier = fichiers && fichiers.length > 0 ? fichiers[0] : null;
		const cover = covers && covers.length > 0 ? covers[0] : null;

		if (!fichier) {
			throw new BadRequestException("Aucun fichier n'a été fourni");
		}

		try {
			// Créer le répertoire s'il n'existe pas
			await fs.mkdir(this.uploadDir, {recursive: true});

			// Créer d'abord le document en base de données pour obtenir l'ID
			const document = await this.prisma.document.create({
				data: {
					title: createLibrairieDto.title,
					description: createLibrairieDto.description || null,
					fileType: this.getFileExtension(fichier.originalname),
					uploadedById: createLibrairieDto.userId,
					fileUrl: '', // Sera mis à jour avec le chemin final
				},
			});

			// Construire le répertoire et le nom final du fichier
			const dirName = `${document.id}`;
			const fileBaseName = `${Date.now()}${this.getFileExtension(fichier.originalname)}`;
			const newFileName = `${dirName}/${fileBaseName}`;
			const dirPath = path.join(this.uploadDir, dirName);

			await fs.mkdir(dirPath, {recursive: true});
			let coverFilePath: string | null = null;

			if (cover) {
				const coverFileName = `cover${this.getFileExtension(cover.originalname)}`;
				const coverAbsPath = path.join(dirPath, coverFileName);
				await fs.rename(cover.path, coverAbsPath);

				coverFilePath = `/uploads/librairie/${dirName}/${coverFileName}`;
			}

			const filePath = path.join(dirPath, fileBaseName);
			await fs.rename(fichier.path, filePath);

			const updatedDocument = await this.prisma.document.update({
				where: {id: document.id},
				data: {
					fileUrl: `/uploads/librairie/${newFileName}`,
					coverImage: coverFilePath,
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
		} catch (error) {
			throw new BadRequestException(
				`Erreur lors de la création du document: ${error.message}`,
			);
		}
	}

	async findAll(search: SearchDocumentDto): Promise<PaginatedResponse<DocumentResponseDto>> {
		const {limit = 10, page = 1} = search;

		const where = {
			title: search.title
				? {contains: search.title, mode: 'insensitive' as const}
				: undefined,
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

	async getFile(id: string) {
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

		const file = createReadStream(join(process.cwd(), document.fileUrl));
		const filename = `${document.title.replace(/["']/g, '')}.pdf`;

		return new StreamableFile(file, {
			type: this.fileUrlToContentType(document.fileUrl),
			disposition: `attachment; filename="${filename}"`,
		});
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

		// Supprimer le fichier du système de fichiers
		if (document.fileUrl) {
			const filePath = path.join(process.cwd(), 'public', document.fileUrl);
			try {
				await fs.unlink(filePath);
			} catch (error) {
				// Le fichier peut ne pas exister, continuer la suppression de la BD
				console.warn(`Impossible de supprimer le fichier: ${error.message}`);
			}
		}

		// Supprimer le document de la base de données
		return this.prisma.document.delete({
			where: {id},
		});
	}

	private getFileExtension(filename: string): string {
		return path.extname(filename);
	}

	private fileUrlToContentType(fileUrl: string): string {
		const extIdx = fileUrl.lastIndexOf('.');
		const ext = extIdx !== -1 ? fileUrl.substring(extIdx + 1) : 'unknown';

		return `application/${ext}`;
	}

	private documentToDto(document: any) {
		const id = document.id;
		const backendUrl = this.configService.get<string>('BACKEND_URL');
		return {
			id,
			title: document.title,
			description: document.description,
			fileType: document.fileType,
			fileUrl: `${backendUrl}/api/v1/librairie/${id}/file`,
			coverImage: document.coverImage,
			uploadedAt: document.uploadedAt,
			uploadedBy: {
				id: document.uploadedBy.id,
				fullname: document.uploadedBy.fullname,
				email: document.uploadedBy.email,
			},
		};
	}
}
