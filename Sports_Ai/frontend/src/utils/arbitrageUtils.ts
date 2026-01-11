import { ArbitrageLeg } from '../services/api';

/**
 * Calculates the arbitrage profit percentage from a set of odds.
 * Formula: (1 / Odds_A) + (1 / Odds_B) + ...
 * Profit % = (1 - Sum) * 100
 */
export function calculateArbitrageProfit(legs: ArbitrageLeg[]): number {
  if (!legs || legs.length === 0) return 0;
  const sumImpliedProb = legs.reduce((sum, leg) => sum + (1 / leg.odds), 0);
  const profit = (1 - sumImpliedProb) * 100;
  return Math.round(profit * 100) / 100;
}

/**
 * Calculates recommended stakes for each leg to guarantee the same return.
 */
export function calculateStakes(
  legs: ArbitrageLeg[], 
  totalStake: number = 100
): { outcome: string; stake: number; potentialReturn: number }[] {
  if (!legs || legs.length === 0) return [];
  
  const sumImpliedProb = legs.reduce((sum, leg) => sum + (1 / leg.odds), 0);
  
  return legs.map(leg => {
    // Stake for this leg = (Total Stake / Odds) / Sum of (1/Odds)
    const stake = (totalStake / leg.odds) / sumImpliedProb;
    const roundedStake = Math.round(stake * 100) / 100;
    return {
      outcome: leg.outcome,
      stake: roundedStake,
      potentialReturn: Math.round(roundedStake * leg.odds * 100) / 100,
    };
  });
}
