import { Plan } from '@prisma/client';
import { PlanCatalogService } from './plan-catalog.service';

describe('PlanCatalogService startup safety', () => {
  it('findAll reads without seeding when the catalog is empty', async () => {
    const prisma = {
      planCatalog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        create: jest.fn(),
      },
    };
    const service = new PlanCatalogService(prisma as never);
    const rows = await service.findAll();
    expect(rows).toEqual([]);
    expect(prisma.planCatalog.findMany).toHaveBeenCalled();
    expect(prisma.planCatalog.create).not.toHaveBeenCalled();
    expect(prisma.planCatalog.count).not.toHaveBeenCalled();
  });

  it('findListed uses in-memory defaults without writing when DB is empty', async () => {
    const prisma = {
      planCatalog: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
    };
    const service = new PlanCatalogService(prisma as never);
    const listed = await service.findListed();
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((p) => p.plan !== Plan.TRIAL)).toBe(true);
    expect(prisma.planCatalog.create).not.toHaveBeenCalled();
  });

  it('getLimits falls back to code defaults without writing', async () => {
    const prisma = {
      planCatalog: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
    };
    const service = new PlanCatalogService(prisma as never);
    const limits = await service.getLimits(Plan.STARTER);
    expect(limits.label).toBeTruthy();
    expect(prisma.planCatalog.create).not.toHaveBeenCalled();
  });
});
