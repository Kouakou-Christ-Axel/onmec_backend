import {
  UploadUrlRequestDto,
  UploadUrlResponseDto,
} from 'src/common/dto/upload-url.dto';

/** Corps de la demande d'URL présignée pour une image d'article (couverture ou contenu). */
export class UploadImageRequestDto extends UploadUrlRequestDto {}

export class UploadImageResponseDto extends UploadUrlResponseDto {}
