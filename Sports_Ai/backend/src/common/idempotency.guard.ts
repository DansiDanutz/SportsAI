import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * In-memory store for idempotency keys
 * In production, this should be replaced with Redis or another distributed cache
 */
interface IdempotencyEntry {
  response: any;
  statusCode: number;
  timestamp: number;
}

class IdempotencyStore {
  private store = new Map<string, IdempotencyEntry>();
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  private maxEntries = 10000;

  get(key: string): IdempotencyEntry | undefined {
    this.cleanup();
    return this.store.get(key);
  }

  set(key: string, entry: IdempotencyEntry): void {
    if (this.store.size >= this.maxEntries) {
      // Remove oldest entries
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.maxEntries * 0.1));
      for (const [k] of toRemove) {
        this.store.delete(k);
      }
    }
    this.store.set(key, entry);
  }

  markProcessing(key: string): void {
    this.store.set(key, {
      response: null,
      statusCode: 0,
      timestamp: Date.now(),
    });
  }

  isProcessing(key: string): boolean {
    const entry = this.store.get(key);
    return entry !== undefined && entry.response === null;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton store instance
const idempotencyStore = new IdempotencyStore();

/**
 * Decorator to mark a controller method as idempotent
 */
export const IDEMPOTENT_KEY = 'idempotent';
export const Idempotent = () => (
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => {
  Reflect.defineMetadata(IDEMPOTENT_KEY, true, descriptor.value);
  return descriptor;
};

/**
 * Guard to handle idempotency for POST requests
 *
 * When an Idempotency-Key header is present:
 * 1. If the key has been seen before with a successful response, return that response
 * 2. If the key is currently being processed, return 409 Conflict
 * 3. Otherwise, process the request and store the response
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only apply to POST requests
    if (request.method !== 'POST') {
      return true;
    }

    // Check if endpoint is marked as idempotent
    const handler = context.getHandler();
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENT_KEY, handler);
    if (!isIdempotent) {
      return true;
    }

    // Get idempotency key from header
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) {
      // No idempotency key, proceed normally
      return true;
    }

    // Create a unique key based on user (if authenticated) + idempotency key
    const userId = request.user?.id || 'anonymous';
    const fullKey = `${userId}:${idempotencyKey}`;

    // Check if we've seen this key before
    const existingEntry = idempotencyStore.get(fullKey);

    if (existingEntry) {
      if (existingEntry.response === null) {
        // Request is still being processed
        throw new ConflictException(
          'A request with this idempotency key is already being processed',
        );
      }

      // Return cached response
      response.status(existingEntry.statusCode);
      response.send(existingEntry.response);
      return false; // Prevent handler from executing
    }

    // Mark as processing
    idempotencyStore.markProcessing(fullKey);

    // Store the key in the request for later use
    request._idempotencyKey = fullKey;

    return true;
  }
}

/**
 * Interceptor to capture and store successful responses for idempotent requests
 */
import {
  CallHandler,
  Injectable as InterceptorInjectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@InterceptorInjectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap((data) => {
        const idempotencyKey = request._idempotencyKey;
        if (idempotencyKey) {
          // Store the successful response
          idempotencyStore.set(idempotencyKey, {
            response: data,
            statusCode: response.statusCode,
            timestamp: Date.now(),
          });
        }
      }),
    );
  }
}

export { idempotencyStore };
