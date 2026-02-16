jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { StrategyService } from '../src/strategy/strategy.service';

// Access private methods via prototype for testing
const service = new (StrategyService as any)({ savePick: jest.fn(), getAllPicks: jest.fn().mockResolvedValue([]) });

describe('StrategyService - Mathematical Functions', () => {
  describe('factorial', () => {
    it('should return 1 for 0 and 1', () => {
      expect(service.factorial(0)).toBe(1);
      expect(service.factorial(1)).toBe(1);
    });

    it('should calculate correctly for small numbers', () => {
      expect(service.factorial(5)).toBe(120);
      expect(service.factorial(3)).toBe(6);
      expect(service.factorial(4)).toBe(24);
    });
  });

  describe('poissonProbability', () => {
    it('should return probability between 0 and 1', () => {
      const result = service.poissonProbability(2.7, 3);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('should return higher probability for higher lambda', () => {
      const lowLambda = service.poissonProbability(1.5, 3);
      const highLambda = service.poissonProbability(3.5, 3);
      expect(highLambda).toBeGreaterThan(lowLambda);
    });

    it('should return ~0.494 for lambda=2.7, k=3 (known value)', () => {
      // P(X >= 3) where X ~ Poisson(2.7)
      const result = service.poissonProbability(2.7, 3);
      expect(result).toBeCloseTo(0.494, 1); // approximate
    });
  });

  describe('calculateKellyPercentage', () => {
    it('should return positive Kelly for value bets', () => {
      // odds=2.0, real prob=0.55 → edge exists
      const kelly = service.calculateKellyPercentage(2.0, 0.55);
      expect(kelly).toBeGreaterThan(0);
    });

    it('should cap at MAX_KELLY_PERCENTAGE (5%)', () => {
      // Very large edge
      const kelly = service.calculateKellyPercentage(5.0, 0.80);
      expect(kelly).toBeLessThanOrEqual(5);
    });

    it('should return minimum 0.5% for small edges', () => {
      const kelly = service.calculateKellyPercentage(2.0, 0.51);
      expect(kelly).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('calculateKellyStake', () => {
    it('should calculate correct stake from percentage', () => {
      expect(service.calculateKellyStake(2, 10000)).toBe(200);
      expect(service.calculateKellyStake(5, 10000)).toBe(500);
    });

    it('should return 0 for 0% kelly', () => {
      expect(service.calculateKellyStake(0, 10000)).toBe(0);
    });
  });

  describe('calculateExpectedValue', () => {
    it('should return positive EV for value bets', () => {
      // odds=2.0, prob=0.55, stake=100
      // EV = (0.55 * 100) - (0.45 * 100) = 10
      const ev = service.calculateExpectedValue(2.0, 0.55, 100);
      expect(ev).toBe(10);
    });

    it('should return negative EV for bad bets', () => {
      // odds=2.0, prob=0.40, stake=100
      // EV = (0.40 * 100) - (0.60 * 100) = -20
      const ev = service.calculateExpectedValue(2.0, 0.40, 100);
      expect(ev).toBe(-20);
    });

    it('should return 0 EV at fair odds', () => {
      // odds=2.0, prob=0.50, stake=100
      const ev = service.calculateExpectedValue(2.0, 0.50, 100);
      expect(ev).toBe(0);
    });
  });

  describe('getPortfolioHealth', () => {
    it('should return excellent for 20%+ returns', () => {
      const health = service.getPortfolioHealth(12000, 2000);
      expect(health.status).toBe('excellent');
    });

    it('should return critical for -10%+ losses', () => {
      const health = service.getPortfolioHealth(8000, -2000);
      expect(health.status).toBe('critical');
      expect(health.risk_level).toBe('high');
    });

    it('should return fair for breakeven', () => {
      const health = service.getPortfolioHealth(10500, 500);
      expect(health.status).toBe('fair');
    });

    it('should set high risk when bankroll < 80% of starting', () => {
      const health = service.getPortfolioHealth(7500, -2500);
      expect(health.risk_level).toBe('high');
    });
  });

  describe('generateRealisticOdds', () => {
    it('should generate valid odds (> 1.0)', () => {
      const event = { strHomeTeam: 'Arsenal', strAwayTeam: 'Chelsea' } as any;
      const odds = service.generateRealisticOdds(event);
      expect(odds.home_win).toBeGreaterThan(1);
      expect(odds.draw).toBeGreaterThan(1);
      expect(odds.away_win).toBeGreaterThan(1);
      expect(odds.over_2_5).toBeGreaterThan(1);
      expect(odds.under_2_5).toBeGreaterThan(1);
    });

    it('should produce odds that reflect approximate probabilities', () => {
      const event = { strHomeTeam: 'A', strAwayTeam: 'B' } as any;
      const odds = service.generateRealisticOdds(event);
      const totalImplied = (1/odds.home_win + 1/odds.draw + 1/odds.away_win);
      // With margin ~1.06 applied to individual probs, total implied should be near 1.0
      expect(totalImplied).toBeGreaterThan(0.8);
      expect(totalImplied).toBeLessThan(1.3);
    });
  });

  describe('findValueBets', () => {
    it('should only return bets with edge > MIN_EDGE_THRESHOLD', () => {
      const event = {
        strHomeTeam: 'Team A', strAwayTeam: 'Team B',
        dateEvent: '2026-02-16', strLeague: 'Test League', strTime: '15:00'
      } as any;
      const odds = { home_win: 2.0, draw: 3.5, away_win: 4.0, over_2_5: 1.9, under_2_5: 2.0, bookmaker: 'Test' };
      const probs = { home_win: 55, draw: 25, away_win: 20, over_2_5: 55, under_2_5: 45, confidence: 80 };

      const picks = service.findValueBets(event, odds, probs);
      for (const pick of picks) {
        expect(pick.edge_percentage).toBeGreaterThan(3);
        expect(pick.strategy).toBe('value_betting');
        expect(pick.status).toBe('pending');
      }
    });
  });
});

describe('StrategyService - Performance Metrics', () => {
  it('should return zero metrics with no completed picks', async () => {
    const metrics = await service.getPerformanceMetrics();
    expect(metrics.totalPicks).toBe(0);
    expect(metrics.wins).toBe(0);
    expect(metrics.roi).toBe(0);
    expect(metrics.currentBankrollUsd).toBe(10000);
  });
});
