import { HttpStatus } from '@nestjs/common';

jest.mock('uuid', () => ({ v4: () => 'test-id' }));

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UploadsService } from '../uploads/uploads.service';

describe('UsersController subscription boundary', () => {
  it('fails closed without verified billing and does not grant premium access', async () => {
    const usersService = {
      updateSubscription: jest.fn(),
    };
    const controller = new UsersController(
      usersService as unknown as UsersService,
      {} as UploadsService,
    );

    await expect(
      controller.upgradeSubscription(
        { user: { id: 'authenticated-user' } } as any,
        { tier: 'premium' },
      ),
    ).rejects.toMatchObject({ status: HttpStatus.SERVICE_UNAVAILABLE });

    expect(usersService.updateSubscription).not.toHaveBeenCalled();
  });
});
