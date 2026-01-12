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
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter()
    );

    console.log('📎 Registering Fastify plugins...');
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

    // Register helmet for security headers including CSP
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...allowedOrigins, 'ws:', 'wss:'],
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

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });

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
