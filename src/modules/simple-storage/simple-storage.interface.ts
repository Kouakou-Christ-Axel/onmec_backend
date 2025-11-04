export interface ISimpleStorageService {
  uploadFiles(
    file: {
      original: Express.Multer.File;
      optimized?: Buffer;
    }[],
    destination: string,
  ): Promise<IS3UploadResult[]>;

  deleteFile(bucker: string, key: string): Promise<void>;
}

export interface IS3UploadResult {
  variant: 'original' | 'optimized';
  url: string;
  bucket: string;
  key: string;
  contentType: string;
  sizeBytes: number;
  etag: string;
}
