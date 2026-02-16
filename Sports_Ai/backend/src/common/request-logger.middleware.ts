import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      // Skip noisy health checks
      if (originalUrl === '/healthz' || originalUrl === '/health' || originalUrl === '/api/monitoring/ping') {
        return;
      }

      const logLine = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(logLine);
      } else if (statusCode >= 400) {
        this.logger.warn(logLine);
      } else if (duration > 3000) {
        this.logger.warn(`SLOW ${logLine}`);
      } else {
        this.logger.log(logLine);
      }
    });

    next();
  }
}
