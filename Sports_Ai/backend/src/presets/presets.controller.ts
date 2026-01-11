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
import { PresetsService } from './presets.service';
import { Idempotent, IdempotencyGuard, IdempotencyInterceptor } from '../common/idempotency.guard';

@Controller('v1/presets')
@UseGuards(JwtAuthGuard, IdempotencyGuard)
@UseInterceptors(IdempotencyInterceptor)
export class PresetsController {
  constructor(private presetsService: PresetsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=120, stale-while-revalidate=240')
  async getAll(@Request() req: any) {
    const presets = await this.presetsService.findAllByUser(req.user.id);
    return {
      presets,
      total: presets.length,
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Request() req: any) {
    // IDOR protection: findByIdForUser verifies ownership
    const preset = await this.presetsService.findByIdForUser(id, req.user.id);
    return preset;
  }

  @Post()
  @Idempotent()
  async create(
    @Request() req: any,
    @Body() body: { name: string; filters: string; sportId?: string; isPinned?: boolean },
  ) {
    const preset = await this.presetsService.create(req.user.id, body);
    return {
      success: true,
      preset,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { name?: string; filters?: string; sportId?: string; isPinned?: boolean; expectedUpdatedAt?: string },
  ) {
    // IDOR protection and optimistic locking: update verifies ownership and checks for conflicts
    const preset = await this.presetsService.update(id, req.user.id, body);
    return {
      success: true,
      preset,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    // IDOR protection: delete verifies ownership
    // Uses soft delete - preset is hidden but retained
    await this.presetsService.delete(id, req.user.id);
    return {
      success: true,
      message: 'Preset deleted',
    };
  }

  @Get('deleted/list')
  async getDeleted(@Request() req: any) {
    // Get all soft-deleted presets for the user
    const presets = await this.presetsService.findDeletedByUser(req.user.id);
    return {
      presets,
      total: presets.length,
    };
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string, @Request() req: any) {
    // Restore a soft-deleted preset
    const preset = await this.presetsService.restore(id, req.user.id);
    return {
      success: true,
      preset,
      message: 'Preset restored',
    };
  }

  @Post(':id/duplicate')
  @Idempotent()
  async duplicate(@Param('id') id: string, @Request() req: any) {
    // Create a copy of the preset with "(Copy)" suffix
    const preset = await this.presetsService.duplicate(id, req.user.id);
    return {
      success: true,
      preset,
      message: 'Preset duplicated',
    };
  }

  @Delete(':id/permanent')
  async permanentDelete(@Param('id') id: string, @Request() req: any) {
    // Permanently delete a preset (cannot be undone)
    await this.presetsService.permanentDelete(id, req.user.id);
    return {
      success: true,
      message: 'Preset permanently deleted',
    };
  }
}
