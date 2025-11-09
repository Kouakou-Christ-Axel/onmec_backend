// typescript
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { fileTypeFromFile } from 'file-type';
import { createReadStream, unlinkSync } from 'fs';
import { Readable } from 'node:stream';
import { ConfigService } from '@nestjs/config';
import {
  IS3UploadResult,
  ISimpleStorageService,
} from './simple-storage.interface';

@Injectable()
export class SimpleStorageService implements ISimpleStorageService {
  private readonly logger = new Logger(SimpleStorageService.name);
  s3Client: S3Client;
  bucketName: string;
  constructor(configService: ConfigService) {
    this.logger.log('Initializing SimpleStorageService');
    this.bucketName = configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');
    this.s3Client = new S3Client({
      region: configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async uploadFiles(
    files: {
      original: Express.Multer.File;
      optimized?: Buffer;
    }[],
    destination: string,
  ) {
    this.logger.debug({
      fileCount: files ? files.length : 0,
      destination,
    });

    if (!files || !files.length) return [];

    const uploads = files.map((file) =>
      this.processFileUpload(file, destination),
    );

    return (await Promise.all(uploads)).flat();
  }

  private async processFileUpload(
    file: { original: Express.Multer.File; optimized?: Buffer },
    destination: string,
  ): Promise<IS3UploadResult[]> {
    const uploadResults: IS3UploadResult[] = [];

    try {
      const detected = await fileTypeFromFile(file.original.path).catch(
        () => null,
      );
      const contentType = detected ? detected.mime : 'application/octet-stream';
      const extension = detected ? `.${detected.ext}` : '';

      const originalResult = await this.uploadFileToS3(
        file.original,
        destination,
        'original',
        contentType,
        extension,
      );
      uploadResults.push(originalResult);

      if (file.optimized) {
        const optimizedResult = await this.uploadOptimizedFile(
          file,
          destination,
          contentType,
        );
        uploadResults.push(optimizedResult);
      }

      return uploadResults;
    } finally {
      this.cleanupTempFile(file.original.path);
    }
  }

  private async uploadFileToS3(
    file: Express.Multer.File,
    destination: string,
    variant: 'original' | 'optimized',
    contentType: string,
    extension: string,
  ): Promise<IS3UploadResult> {
    const key = `${destination}/${Date.now()}-${file.filename}${extension}`;
    const stream = createReadStream(file.path);

    this.logger.debug({
      file: file.path,
      size: file.size,
      contentType,
    });

    let etag = '';
    try {
      const uploader = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: stream,
          ContentType: contentType,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
      });

      uploader.on('httpUploadProgress', (progress) =>
        this.logger.debug({ progress, key }),
      );

      const result: any = await uploader.done();
      etag = result?.ETag ? String(result.ETag).replace(/"/g, '') : '';
    } catch (err) {
      this.logger.error({ err, key }, `${variant} upload failed`);
      throw err;
    }

    return {
      variant: variant as any,
      url: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      bucket: this.bucketName,
      key,
      contentType,
      sizeBytes: file.size,
      etag,
    };
  }

  private async uploadOptimizedFile(
    file: { original: Express.Multer.File; optimized?: Buffer },
    destination: string,
    contentType: string,
  ): Promise<IS3UploadResult> {
    const key = `${destination}/optimized-${Date.now()}-${file.original.filename}.webp`;
    const body = Readable.from(file.optimized!);

    let etag = '';
    try {
      const uploader = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
      });

      const result: any = await uploader.done();
      etag = result?.ETag ? String(result.ETag).replace(/"/g, '') : '';
    } catch (err) {
      this.logger.error({ err, key }, 'Optimized upload failed');
      throw err;
    }

    return {
      variant: 'optimized',
      url: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      bucket: this.bucketName,
      key,
      contentType: 'image/webp',
      sizeBytes: file.optimized!.length,
      etag,
    };
  }

  private cleanupTempFile(path: string): void {
    try {
      unlinkSync(path);
    } catch (e) {
      this.logger.warn({ err: e, path }, 'Failed to unlink temp file');
    }
  }

  async deleteFile(bucketName: string, key: string) {
    this.logger.debug({ key }, 'Deleting file from S3');
    const bucket = bucketName || this.bucketName;
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await this.s3Client.send(deleteCommand);
      this.logger.log({ key }, 'File deleted successfully from S3');
    } catch (err) {
      this.logger.error({ err, key }, 'Failed to delete file from S3');
      throw err;
    }
  }
}
