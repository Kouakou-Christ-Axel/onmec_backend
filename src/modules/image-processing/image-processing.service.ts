import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

type ImageVariant = 'thumbnail' | 'medium' | 'original';

export type ImageVariants = {
  [key in ImageVariant]: Buffer;
};

@Injectable()
export class ImageProcessingService {
  async optimizeImage(
    file: Buffer | string,
    options?: { width?: number; height?: number; quality?: number },
  ) {
    console.log('Optimizing image with options:', options);
    return await sharp(file)
      .resize(options?.width, options?.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: options?.quality ?? 80 })
      .toBuffer();
  }

  async generateVariants(fileBuffer: Buffer) {
    return {
      thumbnail: await this.optimizeImage(fileBuffer, { width: 200 }),
      medium: await this.optimizeImage(fileBuffer, { width: 800 }),
      original: await this.optimizeImage(fileBuffer, { width: 1920 }),
    };
  }
}
