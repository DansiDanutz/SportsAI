import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    const { unreadOnly = false, limit = 50 } = options || {};

    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async findByIdForUser(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // IDOR protection
    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    // First check ownership
    const notification = await this.findByIdForUser(id, userId);

    // Idempotent: If already read, just return the notification without error
    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, message: 'All notifications marked as read' };
  }

  async create(
    userId: string,
    data: { type: string; title: string; message: string; data?: string },
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || '{}',
      },
    });
  }

  async delete(id: string, userId: string) {
    // First verify ownership (IDOR protection)
    await this.findByIdForUser(id, userId);

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async deleteAll(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { success: true, message: 'All notifications deleted' };
  }
}
