import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresetsService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(userId: string, includeDeleted = false) {
    return this.prisma.preset.findMany({
      where: {
        userId,
        // Filter out soft-deleted presets unless explicitly requested
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [
        { isPinned: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findDeletedByUser(userId: string) {
    return this.prisma.preset.findMany({
      where: {
        userId,
        deletedAt: { not: null },
      },
      orderBy: [
        { deletedAt: 'desc' },
      ],
    });
  }

  async findById(id: string, includeDeleted = false) {
    const preset = await this.prisma.preset.findUnique({
      where: { id },
    });
    if (!preset) {
      throw new NotFoundException('Preset not found');
    }
    // Treat soft-deleted presets as not found unless explicitly requested
    if (!includeDeleted && preset.deletedAt) {
      throw new NotFoundException('Preset not found');
    }
    return preset;
  }

  async findByIdForUser(id: string, userId: string, includeDeleted = false) {
    const preset = await this.findById(id, includeDeleted);

    // IDOR Protection: Verify the preset belongs to the requesting user
    if (preset.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return preset;
  }

  async create(
    userId: string,
    data: { name: string; filters: string; sportId?: string; isPinned?: boolean },
  ) {
    return this.prisma.preset.create({
      data: {
        userId,
        name: data.name,
        filters: data.filters,
        sportId: data.sportId,
        isPinned: data.isPinned ?? false,
      },
    });
  }

  async delete(id: string, userId: string) {
    // First verify ownership (IDOR protection)
    await this.findByIdForUser(id, userId);

    // Soft delete: set deletedAt timestamp instead of actually deleting
    return this.prisma.preset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string, userId: string) {
    // Verify ownership including deleted presets
    await this.findByIdForUser(id, userId, true);

    // Restore by clearing deletedAt
    return this.prisma.preset.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async permanentDelete(id: string, userId: string) {
    // Verify ownership including deleted presets
    await this.findByIdForUser(id, userId, true);

    // Actually delete from database
    return this.prisma.preset.delete({
      where: { id },
    });
  }

  async duplicate(id: string, userId: string) {
    // Verify ownership (IDOR protection)
    const original = await this.findByIdForUser(id, userId);

    // Create a copy with "Copy" suffix
    let newName = `${original.name} (Copy)`;

    // Check if name already exists and add number if needed
    const existingPresets = await this.prisma.preset.findMany({
      where: {
        userId,
        name: { startsWith: original.name },
        deletedAt: null,
      },
    });

    // If "Name (Copy)" exists, try "Name (Copy 2)", etc.
    if (existingPresets.some(p => p.name === newName)) {
      let copyNumber = 2;
      while (existingPresets.some(p => p.name === `${original.name} (Copy ${copyNumber})`)) {
        copyNumber++;
      }
      newName = `${original.name} (Copy ${copyNumber})`;
    }

    return this.prisma.preset.create({
      data: {
        userId,
        name: newName,
        filters: original.filters,
        sportId: original.sportId,
        isPinned: false, // Don't copy pinned status
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; filters?: string; sportId?: string; isPinned?: boolean; expectedUpdatedAt?: string },
  ) {
    // First verify ownership (IDOR protection)
    const currentPreset = await this.findByIdForUser(id, userId);

    // Optimistic locking: Check if the preset was modified since the client last fetched it
    if (data.expectedUpdatedAt) {
      const expectedTime = new Date(data.expectedUpdatedAt).getTime();
      const actualTime = currentPreset.updatedAt.getTime();

      if (actualTime > expectedTime) {
        throw new ConflictException(
          'This preset was modified by another session. Please refresh and try again.',
        );
      }
    }

    // Remove expectedUpdatedAt from data before updating
    const { expectedUpdatedAt, ...updateData } = data;

    return this.prisma.preset.update({
      where: { id },
      data: updateData,
    });
  }
}
