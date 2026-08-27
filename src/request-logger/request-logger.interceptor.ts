import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Champs jamais journalisés en clair.
 *
 * L'intercepteur sérialisait le corps de requête tel quel : chaque appel à
 * /auth/login, /auth/register ou /users/password écrivait le mot de passe en
 * clair dans les journaux, et chaque OTP y atterrissait aussi.
 */
const REDACTED_KEYS = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'confirmpassword',
  'otp',
  'otpsecret',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'authorization',
  'apikey',
]);

const REDACTED = '[masqué]';

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? REDACTED
      : redact(val, depth + 1);
  }
  return out;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(redact(value));
  } catch {
    return '[non sérialisable]';
  }
}

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const { method, url, body, query, headers } = request;
    const ip = request.ip || request.connection?.remoteAddress;
    const userAgent = headers['user-agent'] || 'unknown';
    const now = Date.now();

    this.logger.log(
      `Request | ${method} ${url} | IP: ${ip} | UA: ${userAgent} | Body: ${safeStringify(body)} | Query: ${safeStringify(query)}`,
    );

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(
          `Response | ${method} ${url} | ${responseTime}ms | IP: ${ip} | UA: ${userAgent}`,
        );
      }),
    );
  }
}
