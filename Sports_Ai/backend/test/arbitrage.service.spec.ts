import { ArbitrageService } from '../src/arbitrage/arbitrage.service';

// Mock dependencies
const mockPrisma = {
  arbitrageOpportunity: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockLlmService = {
  generateAdvice: jest.fn(),
};

describe('ArbitrageService', () => {
  let service: ArbitrageService;

  beforeEach(() => {
    service = new ArbitrageService(mockPrisma as any, mockLlmService as any);
    jest.clearAllMocks();
  });

  describe('calculateArbitragePercentage', () => {
    it('should detect a positive arbitrage (sure bet)', () => {
      // Odds: 2.10 vs 2.10 → sum of inverse = 0.476 + 0.476 = 0.952 → -4.8% (profit)
      const result = service.calculateArbitragePercentage([2.10, 2.10]);
      expect(result).toBeLessThan(0); // negative = profitable
      expect(result).toBeCloseTo(-4.76, 1);
    });

    it('should detect no arbitrage when margins are high', () => {
      // Odds: 1.50 vs 2.20 → sum = 0.667 + 0.455 = 1.121 → 12.1% (no arb)
      const result = service.calculateArbitragePercentage([1.50, 2.20]);
      expect(result).toBeGreaterThan(0); // positive = no arbitrage
    });

    it('should handle 3-way markets', () => {
      // Odds: 3.00, 3.00, 3.00 → sum = 1.0 → 0% (breakeven)
      const result = service.calculateArbitragePercentage([3.00, 3.00, 3.00]);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should handle extreme odds', () => {
      // Very lopsided: 1.01 vs 100.0
      const result = service.calculateArbitragePercentage([1.01, 100.0]);
      expect(typeof result).toBe('number');
      expect(isFinite(result)).toBe(true);
    });

    it('should handle single outcome', () => {
      const result = service.calculateArbitragePercentage([2.0]);
      expect(result).toBeCloseTo(-50, 0); // 1/2 - 1 = -0.5 = -50%
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return 1.0 for perfect factors', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 1.0,
        bookmakerTrust: 1.0,
        oddsStability: 1.0,
        marketLiquidity: 1.0,
        baseConfidence: 1.0,
      });
      expect(score).toBe(1.0);
    });

    it('should return 0.0 for zero factors', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 0,
        bookmakerTrust: 0,
        oddsStability: 0,
        marketLiquidity: 0,
        baseConfidence: 0,
      });
      expect(score).toBe(0.0);
    });

    it('should weight profit margin highest (35%)', () => {
      const highProfit = service.calculateConfidenceScore({
        profitMargin: 1.0,
        bookmakerTrust: 0,
        oddsStability: 0,
        marketLiquidity: 0,
        baseConfidence: 0,
      });
      expect(highProfit).toBeCloseTo(0.35, 5);
    });

    it('should clamp values between 0 and 1', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 2.0,
        bookmakerTrust: 2.0,
        oddsStability: 2.0,
        marketLiquidity: 2.0,
        baseConfidence: 2.0,
      });
      expect(score).toBe(1.0);
    });

    it('should identify winning tips (>0.95)', () => {
      const score = service.calculateConfidenceScore({
        profitMargin: 0.98,
        bookmakerTrust: 0.95,
        oddsStability: 0.97,
        marketLiquidity: 0.90,
        baseConfidence: 0.85,
      });
      expect(score).toBeGreaterThan(0.9);
    });
  });

  describe('findOpportunities', () => {
    it('should call prisma findMany with correct params', async () => {
      mockPrisma.arbitrageOpportunity.findMany.mockResolvedValue([]);
      const result = await service.findOpportunities();
      expect(result).toEqual([]);
      expect(mockPrisma.arbitrageOpportunity.findMany).toHaveBeenCalledWith({
        include: {
          event: { include: { home: true, away: true, league: true, sport: true } },
          market: true,
        },
        orderBy: { detectedAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should find by id with includes', async () => {
      const mockArb = { id: 'test-1', profitMargin: 2.5 };
      mockPrisma.arbitrageOpportunity.findUnique.mockResolvedValue(mockArb);
      const result = await service.findById('test-1');
      expect(result).toEqual(mockArb);
      expect(mockPrisma.arbitrageOpportunity.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-1' },
        include: {
          event: { include: { home: true, away: true, league: true, sport: true } },
          market: true,
        },
      });
    });

    it('should return null for non-existent id', async () => {
      mockPrisma.arbitrageOpportunity.findUnique.mockResolvedValue(null);
      const result = await service.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('generateAiExplanation', () => {
    it('should return null when opportunity not found', async () => {
      mockPrisma.arbitrageOpportunity.findUnique.mockResolvedValue(null);
      const result = await service.generateAiExplanation('missing-id');
      expect(result).toBeNull();
    });

    it('should return null when event has no teams', async () => {
      mockPrisma.arbitrageOpportunity.findUnique.mockResolvedValue({
        id: 'test',
        event: { home: null, away: null, league: {}, sport: {} },
      });
      const result = await service.generateAiExplanation('test');
      expect(result).toBeNull();
    });

    it('should call LLM and return explanation', async () => {
      mockPrisma.arbitrageOpportunity.findUnique.mockResolvedValue({
        id: 'arb-1',
        profitMargin: 3.5,
        confidenceScore: 0.92,
        event: {
          home: { name: 'Man City' },
          away: { name: 'Liverpool' },
          sport: { name: 'Soccer', key: 'soccer' },
          league: { name: 'EPL' },
          startTimeUtc: new Date('2026-03-01'),
        },
      });
      mockLlmService.generateAdvice.mockResolvedValue([
        { content: 'Market inefficiency detected between bookmakers.' },
      ]);

      const result = await service.generateAiExplanation('arb-1');
      expect(result).toBe('Market inefficiency detected between bookmakers.');
      expect(mockLlmService.generateAdvice).toHaveBeenCalled();
    });

    it('should return default text when LLM returns empty', async () => {
      mockPrisma.arbitrageOpportunity.findUnique.mockResolvedValue({
        id: 'arb-2',
        profitMargin: 1.0,
        confidenceScore: 0.5,
        event: {
          home: { name: 'Team A' },
          away: { name: 'Team B' },
          sport: { name: 'Tennis', key: 'tennis' },
          league: { name: 'ATP' },
          startTimeUtc: new Date(),
        },
      });
      mockLlmService.generateAdvice.mockResolvedValue([{}]);

      const result = await service.generateAiExplanation('arb-2');
      expect(result).toBe('This arbitrage opportunity arises from market inefficiency between bookmakers.');
    });
  });
});
