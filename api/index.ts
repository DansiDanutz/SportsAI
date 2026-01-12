import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../Sports_Ai/backend/src/app.module';

let app: NestFastifyApplication;

export default async function handler(req: any, res: any) {
  if (!app) {
    const adapter = new FastifyAdapter();
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      adapter
    );
    
    app.setGlobalPrefix('api');
    
    await app.init();
    await adapter.getInstance().ready();
  }
  
  app.getHttpAdapter().getInstance().server.emit('request', req, res);
}
