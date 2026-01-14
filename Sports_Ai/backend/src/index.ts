import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from the backend directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import helmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🚀 Starting SportsAI Backend...');
    console.log('📦 Environment check:');
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   - PORT: ${process.env.PORT || '4000 (default)'}`);
    console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ set' : '❌ missing'}`);
    console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ set' : '⚠️  using fallback (not recommended for production)'}`);
    console.log(`   - CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'not set (using defaults)'}`);
    
    // Validate required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required but not set. Please configure it in Render dashboard.');
    }
    
    console.log('🔧 Creating NestJS application...');
    const adapter = new FastifyAdapter({ trustProxy: true });
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      adapter
    );
    const fastifyInstance = adapter.getInstance();

    console.log('📎 Registering Fastify plugins...');
    
    // Cookies (required for secure HttpOnly auth sessions)
    await app.register(fastifyCookie, {
      secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'sportsai-cookie-secret-change-in-production',
    });

    // Register multipart for file uploads
    await app.register(fastifyMultipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
      },
    });

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log(`📁 Creating uploads directory: ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Serve static files from uploads directory
    await app.register(fastifyStatic, {
      root: uploadsDir,
      prefix: '/uploads/',
    });

    // Configure CORS using NestJS's built-in method (works with Fastify)
    // Define CORS variables before helmet (which uses them)
    const defaultLocalOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ];

    const rawCors = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
    const isNonDevRuntime = nodeEnv !== 'development' && nodeEnv !== 'test';

    const isHttpsVercelOrigin = (origin: string): boolean => {
      try {
        const url = new URL(origin);
        return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
      } catch {
        return false;
      }
    };

    // Always allow HTTPS Vercel deployments (preview + prod). This prevents accidental
    // misconfiguration of NODE_ENV/CORS_ORIGIN from breaking the Vercel frontend.
    const allowVercelWildcard =
      rawCors.includes('https://*.vercel.app') ||
      rawCors.includes('*.vercel.app') ||
      rawCors.includes('.vercel.app') ||
      isNonDevRuntime;

    const allowedOrigins = (rawCors.length ? rawCors : defaultLocalOrigins).filter(
      (o) => !['*.vercel.app', '.vercel.app'].includes(o)
    );

    // Configure CORS manually for Fastify compatibility
    fastifyInstance.addHook('onRequest', async (request: any, reply: any) => {
      const origin = request.headers.origin;
      
      // Handle preflight OPTIONS requests
      if (request.method === 'OPTIONS') {
        let allowOrigin = false;
        
        if (!origin) {
          allowOrigin = true; // Non-browser requests
        } else if (allowedOrigins.includes(origin)) {
          allowOrigin = true;
        } else if (isHttpsVercelOrigin(origin)) {
          allowOrigin = true;
        }
        
        if (allowOrigin) {
          reply.header('Access-Control-Allow-Origin', origin || '*');
          reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
          reply.header('Access-Control-Allow-Credentials', 'true');
          reply.header('Access-Control-Max-Age', '86400');
          reply.header('Vary', 'Origin');
          return reply.code(204).send();
        } else {
          return reply.code(403).send({ error: 'CORS blocked origin' });
        }
      }
    });
    
    // Add CORS headers to all responses
    fastifyInstance.addHook('onSend', async (request: any, reply: any) => {
      const origin = request.headers.origin;
      
      if (origin) {
        let allowOrigin = false;
        
        if (allowedOrigins.includes(origin)) {
          allowOrigin = true;
        } else if (isHttpsVercelOrigin(origin)) {
          allowOrigin = true;
        }
        
        if (allowOrigin) {
          reply.header('Access-Control-Allow-Origin', origin);
          reply.header('Access-Control-Allow-Credentials', 'true');
          reply.header('Vary', 'Origin');
        }
      }
    });

    // Register helmet for security headers including CSP
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            ...allowedOrigins,
            ...(allowVercelWildcard ? ['https://*.vercel.app'] : []),
            'ws:',
            'wss:',
          ],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"], // Prevents clickjacking
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API compatibility
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Note: Global API rate limiting is configured via APP_GUARD in AuthModule

    // Swagger (API docs) - enabled in production by default
    const swaggerDisabled = (process.env.DISABLE_SWAGGER || '').toLowerCase() === 'true';
    if (!swaggerDisabled) {
      const config = new DocumentBuilder()
        .setTitle('SportsAI API')
        .setDescription('SportsAI Platform Backend API')
        .setVersion('5.0.0')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
      console.log('📚 Swagger docs enabled at /api/docs');
    }

    console.log('🌐 Starting server...');
    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0');
    console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   SportsAI Platform Backend v5.0.0                ║
  ║   Arbitrage Priority                              ║
  ╠═══════════════════════════════════════════════════╣
  ║   Server running on http://0.0.0.0:${port}            ║
  ║   API Documentation: http://0.0.0.0:${port}/api/docs ║
  ╚═══════════════════════════════════════════════════╝
  `);
    console.log('✅ Application started successfully!');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Unhandled error in bootstrap:', error);
  process.exit(1);
});
