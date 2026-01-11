import { Module, Global } from '@nestjs/common';
import { MappingService } from './mapping.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [MappingService],
  exports: [MappingService],
})
export class IntegrationsModule {}
