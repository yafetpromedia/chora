import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const apiRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pushOnly = process.argv.includes('--push-only');
const argUrl = process.argv.find((a) => a.startsWith('postgresql://'));
const databaseUrl = argUrl || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Set DATABASE_URL or pass a postgresql:// URL as an argument.');
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const run = (args, { allowFail = false } = {}) => {
  const result = spawnSync('npm', args, {
    cwd: apiRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0 && !allowFail) {
    process.exit(result.status ?? 1);
  }
  return result.status === 0;
};

console.log('Generating Prisma client...');
run(['run', 'prisma:generate']);

if (pushOnly) {
  console.log('Applying schema with db push...');
  run(['run', 'prisma:push']);
  process.exit(0);
}

console.log('Applying migrations (deploy)...');
const migrated = run(['run', 'prisma:migrate:deploy'], { allowFail: true });

if (migrated) {
  console.log('Database sync completed (migrations).');
  process.exit(0);
}

console.warn('migrate deploy failed — falling back to db push...');
run(['run', 'prisma:push']);
console.log('Schema applied via db push.');
