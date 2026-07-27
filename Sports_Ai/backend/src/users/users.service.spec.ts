import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService preference policy', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  let service: UsersService;

  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    findUnique.mockResolvedValue({ preferences: null });
    update.mockResolvedValue({});

    const prisma = {
      user: { findUnique, update },
    } as unknown as PrismaService;

    service = new UsersService(prisma);
  });

  it('applies only supported preference fields and ignores prototype keys', async () => {
    const maliciousPatch = JSON.parse(`{
      "display": {
        "theme": "light",
        "__proto__": { "polluted": true }
      },
      "constructor": { "prototype": { "polluted": true } },
      "unknown": true
    }`) as Record<string, unknown>;

    const preferences = await service.updatePreferences('user-1', maliciousPatch);

    expect(preferences).toMatchObject({
      display: {
        theme: 'light',
        oddsFormat: 'decimal',
        timezone: 'UTC',
      },
    });
    expect(Object.prototype.hasOwnProperty.call(preferences, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(preferences, 'unknown')).toBe(false);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();

    const stored = JSON.parse(update.mock.calls[0][0].data.preferences);
    expect(stored).toEqual(preferences);
  });

  it('rejects invalid values by retaining the current safe preference', async () => {
    const preferences = await service.updatePreferences('user-1', {
      display: { oddsFormat: 'javascript:alert(1)' },
      sportsbook: { defaultStake: -50, currency: '../USD' },
      favoriteSports: ['soccer', '<script>', 1],
    });

    expect(preferences).toMatchObject({
      display: { oddsFormat: 'decimal' },
      sportsbook: { defaultStake: 100, currency: 'USD' },
      favoriteSports: ['soccer'],
    });
  });
});
