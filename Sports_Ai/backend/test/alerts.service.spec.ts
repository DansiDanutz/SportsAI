import { NotFoundException } from '@nestjs/common';
import { AlertsService, CreateAlertDto, UpdateAlertDto } from '../src/alerts/alerts.service';

// ── Mocks ────────────────────────────────────────────────────────

const mockPrisma = {
  alertRule: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockNotificationsService = {
  create: jest.fn(),
};

const mockTelegramService = {
  isEnabled: true,
  sendArbitrageAlert: jest.fn(),
  sendOddsAlert: jest.fn(),
  sendTeamEventAlert: jest.fn(),
  sendMessage: jest.fn(),
};

describe('AlertsService', () => {
  let service: AlertsService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertsService(
      mockPrisma as any,
      mockNotificationsService as any,
      mockTelegramService as any,
    );
  });

  // ── CRUD ────────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('returns all alerts for a user ordered by createdAt desc', async () => {
      const alerts = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
      mockPrisma.alertRule.findMany.mockResolvedValue(alerts);

      const result = await service.findAllByUser(userId);

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(alerts);
    });
  });

  describe('findById', () => {
    it('returns the alert when found', async () => {
      const alert = { id: 'a1', userId, name: 'Test' };
      mockPrisma.alertRule.findFirst.mockResolvedValue(alert);

      const result = await service.findById('a1', userId);
      expect(result).toEqual(alert);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue(null);
      await expect(service.findById('missing', userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates an alert rule with serialised conditions', async () => {
      const dto: CreateAlertDto = {
        name: 'Big odds drop',
        type: 'odds_threshold',
        conditions: { threshold: 2.0, direction: 'below' },
      };
      const created = { id: 'new-1', ...dto, isActive: true };
      mockPrisma.alertRule.create.mockResolvedValue(created);

      const result = await service.create(userId, dto);

      expect(mockPrisma.alertRule.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          conditions: JSON.stringify(dto.conditions),
          isActive: true,
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('updates name and isActive when provided', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue({ id: 'a1', userId });
      mockPrisma.alertRule.update.mockResolvedValue({ id: 'a1', name: 'New', isActive: false });

      const dto: UpdateAlertDto = { name: 'New', isActive: false };
      await service.update('a1', userId, dto);

      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { name: 'New', isActive: false },
      });
    });

    it('throws NotFoundException when alert not owned by user', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue(null);
      await expect(service.update('a1', userId, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes the alert rule', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue({ id: 'a1', userId });
      mockPrisma.alertRule.delete.mockResolvedValue({ id: 'a1' });

      await service.delete('a1', userId);
      expect(mockPrisma.alertRule.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue(null);
      await expect(service.delete('missing', userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggle', () => {
    it('flips isActive from true to false', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue({ id: 'a1', userId, isActive: true });
      mockPrisma.alertRule.update.mockResolvedValue({ id: 'a1', isActive: false });

      await service.toggle('a1', userId);
      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { isActive: false },
      });
    });

    it('flips isActive from false to true', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue({ id: 'a1', userId, isActive: false });
      mockPrisma.alertRule.update.mockResolvedValue({ id: 'a1', isActive: true });

      await service.toggle('a1', userId);
      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { isActive: true },
      });
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue(null);
      await expect(service.toggle('missing', userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Alert Evaluation ────────────────────────────────────

  describe('evaluateOddsThresholdAlerts', () => {
    const baseAlert = {
      id: 'alert-1',
      userId,
      name: 'Odds Drop',
      type: 'odds_threshold',
      isActive: true,
    };

    it('triggers when odds drop below threshold', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        { ...baseAlert, conditions: JSON.stringify({ threshold: 2.0, direction: 'below' }) },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      await service.evaluateOddsThresholdAlerts('evt-1', 1.8, 'h2h');

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-1' },
          data: expect.objectContaining({ triggeredCount: { increment: 1 } }),
        }),
      );
    });

    it('does NOT trigger when odds are above threshold (direction=below)', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        { ...baseAlert, conditions: JSON.stringify({ threshold: 2.0, direction: 'below' }) },
      ]);

      await service.evaluateOddsThresholdAlerts('evt-1', 2.5, 'h2h');

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('triggers when odds rise above threshold', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        { ...baseAlert, conditions: JSON.stringify({ threshold: 3.0, direction: 'above' }) },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      await service.evaluateOddsThresholdAlerts('evt-1', 3.5, 'h2h');

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    });

    it('respects sportId filter', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        { ...baseAlert, conditions: JSON.stringify({ threshold: 2.0, direction: 'below', sportId: 'soccer' }) },
      ]);

      // Different sport → no trigger
      await service.evaluateOddsThresholdAlerts('evt-1', 1.5, 'h2h', 'basketball');
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('respects marketKey filter', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        { ...baseAlert, conditions: JSON.stringify({ threshold: 2.0, direction: 'below', marketKey: 'spreads' }) },
      ]);

      // Different market → no trigger
      await service.evaluateOddsThresholdAlerts('evt-1', 1.5, 'h2h');
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('evaluateArbitrageAlerts', () => {
    it('triggers when profit margin meets minimum', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        {
          id: 'arb-1', userId, name: 'Arb Alert', type: 'arbitrage_opportunity',
          conditions: JSON.stringify({ minProfitMargin: 2.0 }),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      await service.evaluateArbitrageAlerts('opp-1', 3.5);

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger when profit margin is below minimum', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        {
          id: 'arb-1', userId, name: 'Arb Alert', type: 'arbitrage_opportunity',
          conditions: JSON.stringify({ minProfitMargin: 5.0 }),
        },
      ]);

      await service.evaluateArbitrageAlerts('opp-1', 3.5);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('evaluateFavoriteTeamAlerts', () => {
    const eventDetails = { opponent: 'Team B', startTime: '2026-02-20T18:00:00Z', league: 'EPL' };

    it('triggers when teamId matches', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        {
          id: 'fav-1', userId, name: 'My Team', type: 'favorite_team_event',
          conditions: JSON.stringify({ teamId: 'team-abc', teamName: 'Team A' }),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      await service.evaluateFavoriteTeamAlerts('evt-1', 'team-abc', 'Team A', eventDetails);

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    });

    it('triggers on case-insensitive teamName match', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        {
          id: 'fav-1', userId, name: 'My Team', type: 'favorite_team_event',
          conditions: JSON.stringify({ teamId: 'different-id', teamName: 'team a' }),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      await service.evaluateFavoriteTeamAlerts('evt-1', 'team-xyz', 'Team A', eventDetails);

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── Telegram Push ───────────────────────────────────────

  describe('Telegram notifications on trigger', () => {
    it('sends Telegram notification when user has chatId', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        {
          id: 'a1', userId, name: 'Test', type: 'odds_threshold',
          conditions: JSON.stringify({ threshold: 2.0, direction: 'below' }),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({ telegramChatId: '999' });
      mockPrisma.alertRule.update.mockResolvedValue({});

      await service.evaluateOddsThresholdAlerts('evt-1', 1.5, 'h2h');

      // Should have attempted to send a Telegram message (generic fallback since type won't exact-match)
      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
    });

    it('does NOT send Telegram when user has no chatId', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        {
          id: 'a1', userId, name: 'Test', type: 'odds_threshold',
          conditions: JSON.stringify({ threshold: 2.0, direction: 'below' }),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({ telegramChatId: null });
      mockPrisma.alertRule.update.mockResolvedValue({});

      await service.evaluateOddsThresholdAlerts('evt-1', 1.5, 'h2h');

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockTelegramService.sendOddsAlert).not.toHaveBeenCalled();
    });
  });

  // ── simulateTrigger ─────────────────────────────────────

  describe('simulateTrigger', () => {
    it('simulates odds_threshold alert', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue({
        id: 'a1', userId, name: 'Drop Alert', type: 'odds_threshold',
        conditions: JSON.stringify({ threshold: 1.5, direction: 'below' }),
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      const result = await service.simulateTrigger('a1', userId);

      expect(result.success).toBe(true);
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('simulates arbitrage_opportunity alert', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue({
        id: 'a1', userId, name: 'Arb', type: 'arbitrage_opportunity',
        conditions: JSON.stringify({ minProfitMargin: 3.0 }),
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      const result = await service.simulateTrigger('a1', userId);
      expect(result.success).toBe(true);
    });

    it('simulates favorite_team_event alert', async () => {
      mockPrisma.alertRule.findFirst.mockResolvedValue({
        id: 'a1', userId, name: 'Fav', type: 'favorite_team_event',
        conditions: JSON.stringify({ teamId: 't1', teamName: 'Team X' }),
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.alertRule.update.mockResolvedValue({});

      const result = await service.simulateTrigger('a1', userId);
      expect(result.success).toBe(true);
    });
  });
});
