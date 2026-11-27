import { PlatformAuthService } from './platform-auth.service';

describe('PlatformAuthService startup safety', () => {
  it('does not implement onModuleInit', () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        PlatformAuthService.prototype,
        'onModuleInit',
      ),
    ).toBe(false);
  });

  it('ensurePlatformOwnerFromEnv skips when env is missing', async () => {
    const prisma = {
      platformUser: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    };
    const service = new PlatformAuthService(
      prisma as never,
      {} as never,
      config as never,
      {} as never,
    );
    const result = await service.ensurePlatformOwnerFromEnv();
    expect(result).toEqual({ created: false, reason: 'missing_env' });
    expect(prisma.platformUser.create).not.toHaveBeenCalled();
  });
});
