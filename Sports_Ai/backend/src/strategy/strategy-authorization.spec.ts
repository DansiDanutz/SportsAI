import { GUARDS_METADATA } from '@nestjs/common/constants';

jest.mock('uuid', () => ({ v4: () => 'test-id' }));

import { AdminGuard, REQUIRE_ADMIN_KEY } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutonomousController } from './autonomous.controller';
import { PortfolioController } from './portfolio.controller';
import { StrategyController } from './strategy.controller';

describe('Strategy authorization boundaries', () => {
  it.each([AutonomousController, PortfolioController, StrategyController])(
    'requires a valid JWT for %p',
    (controller) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[];
      expect(guards).toContain(JwtAuthGuard);
    },
  );

  it.each([
    [AutonomousController, 'runScan'],
    [AutonomousController, 'resolveBets'],
    [AutonomousController, 'updateConfig'],
    [AutonomousController, 'toggleEngine'],
    [AutonomousController, 'freezeBankroll'],
    [AutonomousController, 'setMartingaleMode'],
    [AutonomousController, 'toggleMartingale'],
    [StrategyController, 'resolvePick'],
    [StrategyController, 'generateNewPicks'],
    [StrategyController, 'testBetSlipAnalyzer'],
    [StrategyController, 'generateDailyAccumulators'],
    [StrategyController, 'resolveAccumulators'],
    [StrategyController, 'updateAccumulatorBankroll'],
  ])('requires an administrator for %p.%s', (controller, methodName) => {
    const method = controller.prototype[methodName as never];
    const guards = Reflect.getMetadata(GUARDS_METADATA, method) as unknown[];
    expect(guards).toContain(AdminGuard);
    expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, method)).toBe(true);
  });
});
