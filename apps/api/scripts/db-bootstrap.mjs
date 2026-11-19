import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argUrl = process.argv[2];
const databaseUrl = argUrl || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'DATABASE_URL is not set. Pass it as first arg or set DATABASE_URL in environment.',
  );
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const syncScript = path.join(scriptsDir, 'db-sync.mjs');

console.log('Using DATABASE_URL for bootstrap...');
const sync = spawnSync(process.execPath, [syncScript, databaseUrl], {
  stdio: 'inherit',
  env: process.env,
});

if (sync.status !== 0) {
  process.exit(sync.status ?? 1);
}

console.log('Database schema sync completed. Demo schools and users are not created automatically.');
