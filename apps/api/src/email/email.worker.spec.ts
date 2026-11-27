import { EmailWorker } from './email.worker';

describe('email worker startup', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousJestWorker = process.env.JEST_WORKER_ID;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.JEST_WORKER_ID;
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousJestWorker === undefined) delete process.env.JEST_WORKER_ID;
    else process.env.JEST_WORKER_ID = previousJestWorker;
  });

  function worker(flag?: string) {
    const email = { processDue: jest.fn(), pruneOld: jest.fn() };
    const config = {
      get: (key: string) => (key === 'CHORA_EMAIL_WORKER' ? flag : undefined),
    };
    return new EmailWorker(email as never, config as never);
  }

  it('stays idle unless CHORA_EMAIL_WORKER is true', () => {
    const interval = jest.spyOn(global, 'setInterval');
    worker(undefined).onModuleInit();
    worker('false').onModuleInit();
    expect(interval).not.toHaveBeenCalled();

    const started = worker('true');
    try {
      started.onModuleInit();
      expect(interval).toHaveBeenCalledTimes(1);
    } finally {
      started.onModuleDestroy();
      interval.mockRestore();
    }
  });
});
