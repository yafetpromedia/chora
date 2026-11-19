import { PermissionsService } from './permissions.service';

describe('PermissionsService startup safety', () => {
  it('does not implement OnModuleInit (no automatic bootstrap)', () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        PermissionsService.prototype,
        'onModuleInit',
      ),
    ).toBe(false);
  });

  it('runExplicitBootstrap is opt-in and performs seeds only when called', async () => {
    const prisma = {
      permissionDefinition: { upsert: jest.fn().mockResolvedValue({}) },
      school: { findMany: jest.fn().mockResolvedValue([]) },
      roleTemplate: { findFirst: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new PermissionsService(prisma as never);
    await service.runExplicitBootstrap();
    expect(prisma.permissionDefinition.upsert).toHaveBeenCalled();
    expect(prisma.school.findMany).toHaveBeenCalled();
  });
});
