import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  Header,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  async getAll(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const notifications = await this.notificationsService.findAllByUser(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
    });
    const unreadCount = await this.notificationsService.getUnreadCount(req.user.id);

    return {
      notifications,
      unreadCount,
      total: notifications.length,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { unreadCount: count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    // This operation is idempotent - calling it multiple times on an already-read
    // notification will succeed without error
    const notification = await this.notificationsService.markAsRead(id, req.user.id);
    return {
      success: true,
      notification,
    };
  }

  @Post('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.notificationsService.delete(id, req.user.id);
    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  @Delete()
  async deleteAll(@Request() req: any) {
    return this.notificationsService.deleteAll(req.user.id);
  }

  // Admin/internal endpoint to create notifications (would normally be internal-only)
  @Post()
  async create(
    @Request() req: any,
    @Body() body: { type: string; title: string; message: string; data?: string },
  ) {
    const notification = await this.notificationsService.create(req.user.id, body);
    return {
      success: true,
      notification,
    };
  }
}
