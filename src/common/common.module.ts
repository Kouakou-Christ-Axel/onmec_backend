import { Module, Global } from '@nestjs/common';
import { GenerateDataService } from './services/generate-data.service';
import { HashService } from './services/hash.service';
import { R2StorageService } from './services/r2-storage.service';
@Global()
@Module({
  providers: [GenerateDataService, HashService, R2StorageService],
  exports: [GenerateDataService, HashService, R2StorageService],
})
export class CommonModule { }
