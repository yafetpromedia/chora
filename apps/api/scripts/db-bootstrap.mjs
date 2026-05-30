import { spawnSync } from 'node:child_process';

const argUrl = process.argv[2];
const databaseUrl = argUrl || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'DATABASE_URL is not set. Pass it as first arg or set DATABASE_URL in environment.',
  );
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log('Using DATABASE_URL for bootstrap...');
console.log('Generating Prisma client...');
run('npm', ['run', 'prisma:generate']);

console.log('Applying migrations...');
run('npm', ['run', 'prisma:migrate:deploy']);

console.log('Database bootstrap completed.');
console.log('Note: demo users are auto-seeded when API starts.');
