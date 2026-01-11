import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        role: true,
        creditBalance: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            favorites: true,
            presets: true,
            creditTransactions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      users: users.map((user) => ({
        ...user,
        favoritesCount: user._count.favorites,
        presetsCount: user._count.presets,
        transactionsCount: user._count.creditTransactions,
        _count: undefined,
      })),
      total: users.length,
    };
  }

  async getStats() {
    const [
      totalUsers,
      premiumUsers,
      totalTransactions,
      totalCreditsSpent,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { subscriptionTier: 'premium' } }),
      this.prisma.creditTransaction.count(),
      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'purchase' },
      }),
    ]);

    return {
      totalUsers,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      totalTransactions,
      totalCreditsSpent: totalCreditsSpent._sum.amount || 0,
    };
  }

  async updateUserRole(userId: string, role: string) {
    if (!['user', 'admin'].includes(role)) {
      throw new BadRequestException('Invalid role. Must be "user" or "admin"');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return {
      success: true,
      message: `User role updated to ${role}`,
      user: updated,
    };
  }

  async updateUserSubscription(userId: string, tier: string) {
    if (!['free', 'premium'].includes(tier)) {
      throw new BadRequestException('Invalid subscription tier. Must be "free" or "premium"');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
      },
    });

    return {
      success: true,
      message: `User subscription updated to ${tier}`,
      user: updated,
    };
  }
}
