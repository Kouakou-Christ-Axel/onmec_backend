import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JsonWebTokenService } from './json-web-token.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [JsonWebTokenService],
  exports: [JsonWebTokenService],
})
export class JsonWebTokenModule { }
