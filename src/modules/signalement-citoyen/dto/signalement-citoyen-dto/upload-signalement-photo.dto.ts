import {
  UploadUrlRequestDto,
  UploadUrlResponseDto,
} from 'src/common/dto/upload-url.dto';

/** Corps de la demande d'URL présignée pour la photo d'un signalement. */
export class UploadSignalementPhotoRequestDto extends UploadUrlRequestDto {}

export class UploadSignalementPhotoResponseDto extends UploadUrlResponseDto {}
