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
    // La librairie n'accepte QUE des PDF : extension .pdf et type MIME
    // application/pdf (garde-fou contre un fichier renommé).
    const allowedDocTypes = ['.pdf'];
    const allowedDocMimes = ['application/pdf'];
    const maxDocSizeMB = 20; // taille max d'un document en MB
    const maxCoverSizeMB = 5; // taille max d'une image de couverture en MB

    const validateFile = (
      file: Express.Multer.File,
      allowed: string[],
      maxSizeMB: number,
      allowedMimes?: string[],
    ) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!allowed.includes(ext)) {
        throw new BadRequestException(
          `Type de fichier non autorisé pour « ${file.originalname} » : ${ext || 'inconnu'}. Formats acceptés : ${allowed.join(', ')}.`,
        );
      }

      if (allowedMimes && !allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Le fichier « ${file.originalname} » doit être un PDF valide (type reçu : ${file.mimetype || 'inconnu'}).`,
        );
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new BadRequestException(
          `Fichier trop volumineux : « ${file.originalname} » fait ${fileSizeMB}MB, la taille maximale autorisée est ${maxSizeMB}MB.`,
        );
      }

      // Slugify le nom
      const baseName = slugify(file.originalname.split(ext)[0]);
      file.originalname = `${baseName}${ext}`;
    };

    value.covers?.forEach((file) =>
      validateFile(file, allowedImageTypes, maxCoverSizeMB),
    );
    value.fichiers?.forEach((file) =>
      validateFile(file, allowedDocTypes, maxDocSizeMB, allowedDocMimes),
    );

    return value; // renvoie les fichiers valides & renommés
  }
}
