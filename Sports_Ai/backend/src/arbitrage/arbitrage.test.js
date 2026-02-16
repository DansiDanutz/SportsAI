/**
 * Lightweight unit tests for ArbitrageService core calculations.
 * Run: node src/arbitrage/arbitrage.test.js
 */

// Inline the pure functions (avoids TS compilation)
function calculateArbitragePercentage(odds) {
  const sumInvOdds = odds.reduce((sum, o) => sum + (1 / o), 0);
  return (sumInvOdds - 1) * 100;
}

function calculateConfidenceScore(factors) {
  const score =
    (factors.profitMargin * 0.35) +
    (factors.bookmakerTrust * 0.20) +
    (factors.oddsStability * 0.20) +
    (factors.marketLiquidity * 0.15) +
    (factors.baseConfidence * 0.10);
  return Math.min(Math.max(score, 0), 1);
}

// Simple test runner
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}
function assertClose(a, b, d = 0.01) { if (Math.abs(a - b) > d) throw new Error(`${a} ≠ ${b}`); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n📊 ArbitrageService Tests\n');

console.log('calculateArbitragePercentage:');
test('true arb (2.1/2.1) → negative', () => {
  assertClose(calculateArbitragePercentage([2.1, 2.1]), -4.76, 0.1);
});
test('no arb (1.5/2.0) → positive', () => {
  assert(calculateArbitragePercentage([1.5, 2.0]) > 0);
});
test('fair odds (2.0/2.0) → ~0', () => {
  assertClose(calculateArbitragePercentage([2.0, 2.0]), 0);
});
test('3-way fair (3/3/3) → ~0', () => {
  assertClose(calculateArbitragePercentage([3.0, 3.0, 3.0]), 0);
});
test('3-way arb (3.5/4/3.5) → negative', () => {
  assert(calculateArbitragePercentage([3.5, 4.0, 3.5]) < 0);
});

console.log('\ncalculateConfidenceScore:');
test('weighted calc = 0.775', () => {
  assertClose(calculateConfidenceScore({
    profitMargin: 0.8, bookmakerTrust: 0.9, oddsStability: 0.7,
    marketLiquidity: 0.6, baseConfidence: 0.85
  }), 0.775);
});
test('all 1.0 → 1.0', () => {
  assertClose(calculateConfidenceScore({
    profitMargin: 1, bookmakerTrust: 1, oddsStability: 1,
    marketLiquidity: 1, baseConfidence: 1
  }), 1.0);
});
test('all 0 → 0', () => {
  assertClose(calculateConfidenceScore({
    profitMargin: 0, bookmakerTrust: 0, oddsStability: 0,
    marketLiquidity: 0, baseConfidence: 0
  }), 0);
});
test('clamps above 1', () => {
  assertClose(calculateConfidenceScore({
    profitMargin: 5, bookmakerTrust: 5, oddsStability: 5,
    marketLiquidity: 5, baseConfidence: 5
  }), 1.0);
});
test('winning tip threshold (>0.95)', () => {
  const s = calculateConfidenceScore({
    profitMargin: 1, bookmakerTrust: 0.95, oddsStability: 0.95,
    marketLiquidity: 0.9, baseConfidence: 0.9
  });
  assert(s > 0.95, `score ${s} not > 0.95`);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
