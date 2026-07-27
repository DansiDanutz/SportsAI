import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TheOddsApiService } from './the-odds-api.service';

describe('TheOddsApiService request policy', () => {
  const get = jest.fn();
  let service: TheOddsApiService;

  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: [] });

    const configService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    } as unknown as ConfigService;

    service = new TheOddsApiService(configService);
    (service as unknown as { client: { get: typeof get } }).client = { get };
  });

  it.each([
    '../admin',
    '//169.254.169.254/latest/meta-data',
    'https://attacker.invalid',
    'soccer_epl?apiKey=attacker',
    'soccer_unknown_league',
  ])('rejects an unsafe sport key: %s', async (sportKey) => {
    await expect(service.getOdds(sportKey)).rejects.toBeInstanceOf(BadRequestException);
    expect(get).not.toHaveBeenCalled();
  });

  it('uses a validated relative path for a supported sport-key shape', async () => {
    await service.getOdds('soccer_epl', 'eu,uk', 'h2h,totals');

    expect(get).toHaveBeenCalledWith('/soccer_epl/odds', {
      params: {
        regions: 'eu,uk',
        markets: 'h2h,totals',
        oddsFormat: 'decimal',
      },
    });
  });
});
