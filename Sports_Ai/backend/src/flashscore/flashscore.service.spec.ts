import { FlashscoreService } from './flashscore.service';

describe('FlashscoreService worker pool', () => {
  it('settles every item without exceeding the concurrency limit', async () => {
    const service = new FlashscoreService();
    let active = 0;
    let peak = 0;

    const results = await (service as any).mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (value: number) => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
        if (value === 3) throw new Error('expected rejection');
        return value * 2;
      },
    );

    expect(peak).toBe(2);
    expect(results).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 4 },
      { status: 'rejected', reason: expect.any(Error) },
      { status: 'fulfilled', value: 8 },
      { status: 'fulfilled', value: 10 },
    ]);
  });

  it('returns immediately for an empty input', async () => {
    const service = new FlashscoreService();
    const worker = jest.fn();

    const results = await (service as any).mapWithConcurrency([], 2, worker);

    expect(results).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });
});
