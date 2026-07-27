import { HttpStatus } from '@nestjs/common';
import { TelegramWebhookController } from './telegram-webhook.controller';

describe('TelegramWebhookController trust boundary', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalWebhookSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = originalWebhookSecret;
  });

  it('fails closed in production when the Telegram secret is not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const prisma = { user: { findMany: jest.fn(), update: jest.fn() } };
    const telegram = { sendMessage: jest.fn(), sendWelcome: jest.fn() };
    const controller = new TelegramWebhookController(prisma as any, telegram as any);

    await expect(
      (controller.handleWebhook as any)({ message: { text: '/start code' } }, undefined),
    ).rejects.toMatchObject({ status: HttpStatus.SERVICE_UNAVAILABLE });

    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('rejects forged webhook requests', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-webhook-secret';
    const prisma = { user: { findMany: jest.fn(), update: jest.fn() } };
    const telegram = { sendMessage: jest.fn(), sendWelcome: jest.fn() };
    const controller = new TelegramWebhookController(prisma as any, telegram as any);

    await expect(
      (controller.handleWebhook as any)({ message: { text: '/start code' } }, 'forged'),
    ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });

    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('does not treat a substring in preferences as a valid link code', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-webhook-secret';
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'user-1', preferences: '{"darkMode":true}' },
        ]),
        update: jest.fn(),
      },
    };
    const telegram = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      sendWelcome: jest.fn(),
    };
    const controller = new TelegramWebhookController(prisma as any, telegram as any);

    await (controller.handleWebhook as any)(
      { message: { chat: { id: 7 }, text: '/start true' } },
      'configured-webhook-secret',
    );

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(telegram.sendWelcome).not.toHaveBeenCalled();
  });
});
