import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminGuard, REQUIRE_ADMIN_KEY } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

describe('WalletController authorization boundary', () => {
  const wallet = {
    email: 'member@example.test',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    totalDeposited: 0,
    depositHistory: [],
    withdrawalHistory: [],
    profitHistory: [],
  };

  const service = {
    getUserBalance: jest.fn().mockResolvedValue({ currentBalance: 0 }),
    getUserWallet: jest.fn().mockResolvedValue(wallet),
    processDeposit: jest.fn(),
    requestWithdrawal: jest.fn().mockResolvedValue({
      success: true,
      message: 'Withdrawal requested',
      withdrawalId: 'wit_1',
    }),
    approveWithdrawal: jest.fn().mockResolvedValue({
      success: true,
      message: 'Withdrawal approved',
    }),
    getAllWallets: jest.fn().mockResolvedValue([]),
    distributeMonthlyProfits: jest.fn().mockResolvedValue({
      usersProcessed: 0,
      totalDistributed: 0,
      platformFees: 0,
    }),
  };

  let controller: WalletController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WalletController(service as unknown as WalletService);
  });

  it.each([
    'getBalance',
    'getDeposits',
    'getWithdrawals',
    'getProfitShare',
    'deposit',
    'withdraw',
  ])('requires a valid JWT for %s', (methodName) => {
    const method = WalletController.prototype[methodName as keyof WalletController];
    const guards = Reflect.getMetadata(GUARDS_METADATA, method) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
  });

  it.each(['approveWithdrawal', 'getPendingWithdrawals', 'distributeProfits'])(
    'requires an administrator for %s',
    (methodName) => {
      const method = WalletController.prototype[methodName as keyof WalletController];
      const guards = Reflect.getMetadata(GUARDS_METADATA, method) as unknown[];
      expect(guards).toContain(AdminGuard);
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, method)).toBe(true);
    },
  );

  it('reads only the authenticated user wallet', async () => {
    await controller.getBalance({ user: { id: 'authenticated-user' } } as any);

    expect(service.getUserBalance).toHaveBeenCalledWith('authenticated-user');
    expect(service.getUserWallet).toHaveBeenCalledWith('authenticated-user');
  });

  it('requests a withdrawal only for the authenticated user', async () => {
    await controller.withdraw(
      { user: { id: 'authenticated-user' } } as any,
      { amount: 25 },
    );

    expect(service.requestWithdrawal).toHaveBeenCalledWith('authenticated-user', 25);
  });

  it('uses the authenticated administrator identity for approvals', async () => {
    await controller.approveWithdrawal(
      'wit_1',
      { user: { id: 'authenticated-admin' } } as any,
    );

    expect(service.approveWithdrawal).toHaveBeenCalledWith(
      'wit_1',
      'authenticated-admin',
    );
  });

  it('fails closed before recording an unverified deposit', async () => {
    await expect(
      controller.deposit(
        { user: { id: 'authenticated-user' } } as any,
        { amount: 100, method: 'card' },
      ),
    ).rejects.toMatchObject({ status: HttpStatus.SERVICE_UNAVAILABLE });

    expect(service.processDeposit).not.toHaveBeenCalled();
  });
});
