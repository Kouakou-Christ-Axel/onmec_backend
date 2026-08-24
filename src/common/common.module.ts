import { Module, Global } from '@nestjs/common';
import { GenerateDataService } from './services/generate-data.service';
import { GenerateConfigService } from './services/generate-config.service';
import { HashService } from './services/hash.service';
@Global()
@Module({
  providers: [GenerateDataService, GenerateConfigService, HashService],
  exports: [GenerateDataService, GenerateConfigService, HashService],
})
export class CommonModule { }
