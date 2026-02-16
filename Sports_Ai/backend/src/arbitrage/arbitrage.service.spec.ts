import { ArbitrageService } from './arbitrage.service';

describe('ArbitrageService', () => {
  let service: ArbitrageService;

  beforeEach(() => {
    // Create service with mocked dependencies
    service = new ArbitrageService(null as any, null as any);
  });

  describe('calculateArbitragePercentage', () => {
    it('should return negative for a true arbitrage opportunity', () => {
      // Home @ 2.10, Away @ 2.10 → 1/2.1 + 1/2.1 = 0.952 → -4.76%
      const result = service.calculateArbitragePercentage([2.1, 2.1]);
      expect(result).toBeCloseTo(-4.76, 1);
    });

    it('should return positive when no arbitrage exists', () => {
      // Home @ 1.5, Away @ 2.0 → 1/1.5 + 1/2 = 1.167 → +16.7%
      const result = service.calculateArbitragePercentage([1.5, 2.0]);
      expect(result).toBeGreaterThan(0);
    });

    it('should return ~0 for perfectly fair odds', () => {
      const result = service.calculateArbitragePercentage([2.0, 2.0]);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should handle 3-way markets', () => {
      // Home 3.0, Draw 3.0, Away 3.0 → sum = 1.0 → 0%
      const result = service.calculateArbitragePercentage([3.0, 3.0, 3.0]);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should detect arb in 3-way market', () => {
      // Home 3.5, Draw 4.0, Away 3.5 → 0.286+0.25+0.286 = 0.821 → -17.9%
      const result = service.calculateArbitragePercentage([3.5, 4.0, 3.5]);
      expect(result).toBeLessThan(0);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return weighted score between 0 and 1', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 0.8,
        bookmakerTrust: 0.9,
        oddsStability: 0.7,
        marketLiquidity: 0.6,
        baseConfidence: 0.85,
      });
      // 0.8*0.35 + 0.9*0.20 + 0.7*0.20 + 0.6*0.15 + 0.85*0.10 = 0.28+0.18+0.14+0.09+0.085 = 0.775
      expect(score).toBeCloseTo(0.775, 2);
    });

    it('should cap at 1.0 for max inputs', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 1.0,
        bookmakerTrust: 1.0,
        oddsStability: 1.0,
        marketLiquidity: 1.0,
        baseConfidence: 1.0,
      });
      expect(score).toBe(1.0);
    });

    it('should floor at 0.0 for zero inputs', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 0,
        bookmakerTrust: 0,
        oddsStability: 0,
        marketLiquidity: 0,
        baseConfidence: 0,
      });
      expect(score).toBe(0);
    });

    it('should clamp values above 1', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 5,
        bookmakerTrust: 5,
        oddsStability: 5,
        marketLiquidity: 5,
        baseConfidence: 5,
      });
      expect(score).toBe(1.0);
    });

    it('should identify winning tips (>0.95)', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 1.0,
        bookmakerTrust: 0.95,
        oddsStability: 0.95,
        marketLiquidity: 0.9,
        baseConfidence: 0.9,
      });
      expect(score).toBeGreaterThan(0.95);
    });
  });
});
