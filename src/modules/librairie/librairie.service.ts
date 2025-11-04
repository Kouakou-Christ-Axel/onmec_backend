import { BadRequestException, Injectable, NotFoundException, StreamableFile, } from '@nestjs/common';
import { PrismaService } from '../../database/services/prisma.service';
import { CreateDocumentDto, DocumentFilesDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import { join } from 'path';
import { SearchDocumentDto } from './dto/search-document.dto';

@Injectable()
export class LibrairieService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'librairie');

  constructor(private readonly prisma: PrismaService) {}

  async create(createLibrairieDto: CreateDocumentDto, files: DocumentFilesDto) {
    const { fichiers, covers } = files;
    const fichier = fichiers && fichiers.length > 0 ? fichiers[0] : null;
    const cover = covers && covers.length > 0 ? covers[0] : null;

    if (!fichier) {
      throw new BadRequestException("Aucun fichier n'a été fourni");
    }

    try {
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(this.uploadDir, { recursive: true });

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

      await fs.mkdir(dirPath, { recursive: true });
      let coverFilePath: string | null = null;

      if (cover) {
        const coverFileName = `cover${this.getFileExtension(cover.originalname)}`;
        const coverAbsPath = path.join(dirPath, coverFileName);
        await fs.rename(cover.path, coverAbsPath);

        coverFilePath = `/uploads/librairie/${dirName}/${coverFileName}`;
      }

      const filePath = path.join(dirPath, fileBaseName);
      await fs.rename(fichier.path, filePath);

      return await this.prisma.document.update({
        where: { id: document.id },
        data: {
          fileUrl: `/uploads/librairie/${newFileName}`,
          coverImage: coverFilePath,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la création du document: ${error.message}`,
      );
    }
  }

  async findAll(search: SearchDocumentDto) {
    return this.prisma.document.findMany({
      where: {
        title: search.title
          ? { contains: search.title, mode: 'insensitive' }
          : undefined,
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
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
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

    return document;
  }

  async getFile(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
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

  async update(id: string, updateLibrairieDto: UpdateDocumentDto) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document avec l'ID ${id} non trouvé`);
    }

    return this.prisma.document.update({
      where: { id },
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
  }

  async remove(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
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
      where: { id },
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
}
