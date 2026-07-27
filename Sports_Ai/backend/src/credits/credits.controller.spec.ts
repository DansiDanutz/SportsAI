import { HttpStatus } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';

describe('CreditsController purchase boundary', () => {
  it('fails closed without verified payment and does not mint credits', async () => {
    const service = {
      purchaseCredits: jest.fn(),
    };
    const controller = new CreditsController(service as unknown as CreditsService);

    await expect(
      controller.purchaseCredits(
        { user: { id: 'authenticated-user' } } as any,
        { credits: 1000, price: 0 },
      ),
    ).rejects.toMatchObject({ status: HttpStatus.SERVICE_UNAVAILABLE });

    expect(service.purchaseCredits).not.toHaveBeenCalled();
  });

  it('uses the server-defined unlock price', async () => {
    const service = {
      unlockOpportunity: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new CreditsController(service as unknown as CreditsService);

    await controller.unlockOpportunity(
      { user: { id: 'authenticated-user' } } as any,
      { opportunityId: 'opportunity-1', creditCost: 1 } as any,
    );

    expect(service.unlockOpportunity).toHaveBeenCalledWith(
      'authenticated-user',
      'opportunity-1',
      10,
    );
  });
});
