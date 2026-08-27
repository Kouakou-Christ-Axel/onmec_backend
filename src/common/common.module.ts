import { Module, Global } from '@nestjs/common';
import { GenerateDataService } from './services/generate-data.service';
import { GenerateConfigService } from './services/generate-config.service';
import { HashService } from './services/hash.service';
import { R2StorageService } from './services/r2-storage.service';
@Global()
@Module({
  providers: [GenerateDataService, GenerateConfigService, HashService, R2StorageService],
  exports: [GenerateDataService, GenerateConfigService, HashService, R2StorageService],
})
export class CommonModule { }
