import {
  UploadUrlRequestDto,
  UploadUrlResponseDto,
} from 'src/common/dto/upload-url.dto';

/** Corps de la demande d'URL présignée pour un avatar de membre. */
export class UploadAvatarRequestDto extends UploadUrlRequestDto {}

export class UploadAvatarResponseDto extends UploadUrlResponseDto {}
