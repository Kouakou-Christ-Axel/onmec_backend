import { Global, Module } from '@nestjs/common';
import { SimpleStorageService } from './simple-storage.service';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'SIMPLE_STORAGE_SERVICE',
      useFactory: (configService: ConfigService) => {
        return new SimpleStorageService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SIMPLE_STORAGE_SERVICE'],
})
export class SimpleStorageModule {}
