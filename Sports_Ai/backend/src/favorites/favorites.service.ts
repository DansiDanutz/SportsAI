import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
    });
  }

  async findById(id: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id },
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    return favorite;
  }

  async findByIdForUser(id: string, userId: string) {
    const favorite = await this.findById(id);

    // IDOR Protection: Verify the favorite belongs to the requesting user
    if (favorite.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return favorite;
  }

  async create(userId: string, entityType: string, entityId: string) {
    return this.prisma.favorite.create({
      data: {
        userId,
        entityType,
        entityId,
      },
    });
  }

  async delete(id: string, userId: string) {
    // First verify ownership (IDOR protection)
    await this.findByIdForUser(id, userId);

    return this.prisma.favorite.delete({
      where: { id },
    });
  }

  async update(id: string, userId: string, data: { entityType?: string; entityId?: string }) {
    // First verify ownership (IDOR protection)
    await this.findByIdForUser(id, userId);

    return this.prisma.favorite.update({
      where: { id },
      data,
    });
  }

  async bulkDelete(ids: string[], userId: string) {
    // Verify all favorites belong to user before deletion (IDOR protection)
    const favorites = await this.prisma.favorite.findMany({
      where: {
        id: { in: ids },
        userId: userId,
      },
    });

    // Only delete the ones that belong to this user
    const validIds = favorites.map(f => f.id);

    if (validIds.length === 0) {
      return { deleted: 0, ids: [] };
    }

    const result = await this.prisma.favorite.deleteMany({
      where: {
        id: { in: validIds },
      },
    });

    return {
      deleted: result.count,
      ids: validIds,
    };
  }
}
