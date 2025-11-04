import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import slugify from '../../../../utils/slugify';
import { extname } from 'path';
import { DocumentFilesDto } from '../../librairie/dto/create-document.dto';

@Injectable()
export class UploadValidationPipe implements PipeTransform {
  transform(
    value: DocumentFilesDto = { fichiers: [], covers: [] },
    metadata: ArgumentMetadata,
  ) {
    const { fichiers } = value;

    // validation des images
    if (!fichiers || fichiers.length < 1) {
      throw new BadRequestException('Au moins 1 image est requise.');
    }

    const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedDocTypes = ['.pdf', '.epub', '.mobi', '.docx', '.txt'];
    const maxSizeMB = 50; // taille max en MB

    const validateFile = (file: Express.Multer.File, allowed: string[]) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!allowed.includes(ext)) {
        throw new BadRequestException(`Type de fichier non autorisé: ${ext}`);
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new BadRequestException(
          `Fichier trop volumineux: ${file.originalname}, taille maximale autorisée est ${maxSizeMB}MB.`,
        );
      }

      // Slugify le nom
      const baseName = slugify(file.originalname.split(ext)[0]);
      file.originalname = `${baseName}${ext}`;
    };

    value.covers?.forEach((file) => validateFile(file, allowedImageTypes));
    value.fichiers?.forEach((file) => validateFile(file, allowedDocTypes));

    return value; // renvoie les fichiers valides & renommés
  }
}
