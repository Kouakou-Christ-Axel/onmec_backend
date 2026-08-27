import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const NOT_CONFIGURED_MESSAGE = 'Stockage R2 non configuré';

/**
 * Service de stockage objet Cloudflare R2 (compatible S3).
 * Génère des URL PUT présignées pour un upload direct client -> R2 ;
 * le backend ne reçoit jamais les octets des fichiers.
 */
@Injectable()
export class R2StorageService {
  private readonly client: S3Client | null = null;
  private readonly bucketName?: string;
  private readonly publicUrl?: string;

  constructor(configService: ConfigService) {
    const accountId = configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = configService.get<string>('R2_SECRET_ACCESS_KEY');
    const bucketName = configService.get<string>('R2_BUCKET_NAME');
    this.publicUrl = configService.get<string>('R2_PUBLIC_URL');

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      this.bucketName = bucketName;
      this.client = new S3Client({
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        region: 'auto',
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 300,
  ): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(NOT_CONFIGURED_MESSAGE);
    }
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Télécharge un objet R2 entièrement en mémoire, pour un traitement ponctuel côté backend. */
  async getObjectBuffer(key: string): Promise<Buffer> {
    if (!this.client) {
      throw new ServiceUnavailableException(NOT_CONFIGURED_MESSAGE);
    }
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      throw new ServiceUnavailableException(NOT_CONFIGURED_MESSAGE);
    }
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  getPublicUrl(key: string): string {
    const base = (this.publicUrl ?? '').replace(/\/+$/, '');
    const path = key.replace(/^\/+/, '');
    return `${base}/${path}`;
  }
}
