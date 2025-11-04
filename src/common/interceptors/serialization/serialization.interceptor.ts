import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { type ClassConstructor, plainToInstance } from 'class-transformer';

@Injectable()
export class SerializationInterceptor<T> implements NestInterceptor {
  private logger = new Logger(SerializationInterceptor.name);
  constructor(private classConstructor: ClassConstructor<T>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        return this.serialize(data);
      }),
    );
  }

  private serialize(value: unknown): unknown {
    const options = {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    };

    // Si on reçoit un tableau d'entités
    if (Array.isArray(value)) {
      return plainToInstance(this.classConstructor, value, options);
    }

    // Si on reçoit un wrapper (ex: PageDto { data: [...], total, ... })
    if (
      value &&
      typeof value === 'object' &&
      'data' in value &&
      Array.isArray((value as any).data)
    ) {
      const wrapper = value as any;
      return {
        ...wrapper,
        data: plainToInstance(this.classConstructor, wrapper.data, options),
      };
    }

    // Cas général (objet unique)
    return plainToInstance(this.classConstructor, value as object, options);
  }
}
