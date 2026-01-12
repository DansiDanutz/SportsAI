import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../Sports_Ai/backend/src/app.module';

let app: NestFastifyApplication;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter()
    );
    await app.init();
  }
  
  const instance = app.getHttpAdapter().getInstance();
  instance.routing(req, res);
}
