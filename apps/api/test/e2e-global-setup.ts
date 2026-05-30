import { execSync } from 'child_process';

module.exports = () => {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'Set TEST_DATABASE_URL (or DATABASE_URL) before running e2e tests.',
    );
  }

  process.env.DATABASE_URL = databaseUrl;

  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
  return Promise.resolve();
};
