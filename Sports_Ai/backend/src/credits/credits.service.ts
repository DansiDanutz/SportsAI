import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UnlockResult {
  success: boolean;
  message: string;
  newBalance: number;
  unlockedContent?: {
    opportunityId: string;
    details: string;
  };
}

@Injectable()
export class CreditsService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });
    return user?.creditBalance || 0;
  }

  async unlockOpportunity(
    userId: string,
    opportunityId: string,
    creditCost: number = 10
  ): Promise<UnlockResult> {
    // Get current balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    const currentBalance = user?.creditBalance || 0;

    // Check if user has sufficient credits
    if (currentBalance < creditCost) {
      throw new BadRequestException({
        message: 'Insufficient credits',
        required: creditCost,
        available: currentBalance,
        shortfall: creditCost - currentBalance,
      });
    }

    // Deduct credits and record transaction
    // Note: opportunityId is optional - it may be a mock ID during development
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { creditBalance: { decrement: creditCost } },
      }),
      this.prisma.creditTransaction.create({
        data: {
          userId,
          type: 'unlock',
          amount: -creditCost,
          // Only link to opportunity if it's a valid UUID (not mock data)
          ...(opportunityId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            ? { opportunityId }
            : {}),
        },
      }),
    ]);

    return {
      success: true,
      message: 'Winning Tip unlocked successfully!',
      newBalance: updatedUser.creditBalance,
      unlockedContent: {
        opportunityId,
        details: 'Full betting strategy and stake recommendations now available',
      },
    };
  }

  async purchaseCredits(
    userId: string,
    credits: number,
    price: number
  ): Promise<{ success: boolean; newBalance: number }> {
    // Record purchase and update balance
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: credits } },
      }),
      this.prisma.creditTransaction.create({
        data: {
          userId,
          type: 'purchase',
          amount: credits,
        },
      }),
    ]);

    return {
      success: true,
      newBalance: updatedUser.creditBalance,
    };
  }

  async getTransactionHistory(userId: string, limit: number = 20) {
    return this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        opportunity: {
          select: {
            event: {
              select: {
                home: { select: { name: true } },
                away: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  async getUnlockedOpportunities(userId: string): Promise<string[]> {
    // Get all unlock transactions for this user
    const unlockTransactions = await this.prisma.creditTransaction.findMany({
      where: {
        userId,
        type: 'unlock',
      },
      select: {
        opportunityId: true,
      },
    });

    // Return unique opportunity IDs that were unlocked
    // Note: opportunityId may be null for mock unlocks, filter those out
    return unlockTransactions
      .map(t => t.opportunityId)
      .filter((id): id is string => id !== null);
  }
}
