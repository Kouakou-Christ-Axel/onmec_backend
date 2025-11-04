import { UseInterceptors } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { SerializationInterceptor } from '../interceptors/serialization/serialization.interceptor';

export function Serialize<T>(classConstructor: ClassConstructor<T>) {
  return UseInterceptors(new SerializationInterceptor(classConstructor));
}
