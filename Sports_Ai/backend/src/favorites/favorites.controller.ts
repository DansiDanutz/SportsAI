import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  Request,
  Header,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import { Idempotent, IdempotencyGuard, IdempotencyInterceptor } from '../common/idempotency.guard';

@Controller('v1/favorites')
@UseGuards(JwtAuthGuard, IdempotencyGuard)
@UseInterceptors(IdempotencyInterceptor)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
  async getAll(@Request() req: any) {
    const favorites = await this.favoritesService.findAllByUser(req.user.id);
    return {
      favorites,
      total: favorites.length,
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Request() req: any) {
    // IDOR protection: findByIdForUser verifies ownership
    const favorite = await this.favoritesService.findByIdForUser(id, req.user.id);
    return favorite;
  }

  @Post()
  @Idempotent()
  async create(
    @Request() req: any,
    @Body() body: { entityType: string; entityId: string },
  ) {
    const favorite = await this.favoritesService.create(
      req.user.id,
      body.entityType,
      body.entityId,
    );
    return {
      success: true,
      favorite,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { entityType?: string; entityId?: string },
  ) {
    // IDOR protection: update verifies ownership
    const favorite = await this.favoritesService.update(id, req.user.id, body);
    return {
      success: true,
      favorite,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    // IDOR protection: delete verifies ownership
    await this.favoritesService.delete(id, req.user.id);
    return {
      success: true,
      message: 'Favorite deleted',
    };
  }

  @Post('bulk-delete')
  async bulkDelete(@Request() req: any, @Body() body: { ids: string[] }) {
    // IDOR protection: bulkDelete verifies ownership of all items
    const result = await this.favoritesService.bulkDelete(body.ids, req.user.id);
    return {
      success: true,
      deleted: result.deleted,
      ids: result.ids,
    };
  }
}
