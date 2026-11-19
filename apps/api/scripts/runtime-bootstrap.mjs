/**
 * Explicit, opt-in runtime catalog/owner bootstrap.
 *
 * NEVER run automatically on API startup. NEVER run against production
 * unless an operator has reviewed docs/PRODUCTION_STARTUP_SAFETY.md and
 * intentionally set the allow flag for a disposable or approved target.
 *
 * Usage:
 *   CHORA_ALLOW_RUNTIME_BOOTSTRAP=1 DATABASE_URL=postgresql://… \
 *     node ./scripts/runtime-bootstrap.mjs
 *
 * Optional platform owner (only if both set AND user missing):
 *   PLATFORM_OWNER_EMAIL / PLATFORM_OWNER_PASSWORD
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

if (process.env.CHORA_ALLOW_RUNTIME_BOOTSTRAP !== '1') {
  console.error(
    'Refusing to run: set CHORA_ALLOW_RUNTIME_BOOTSTRAP=1 to acknowledge explicit bootstrap.',
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error('Refusing to run: DATABASE_URL is required.');
  process.exit(1);
}

const dbName = (() => {
  try {
    return new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '').split('?')[0];
  } catch {
    return '(unparseable)';
  }
})();

console.log(`Runtime bootstrap target database name: ${dbName}`);
console.log('This will upsert permission catalog rows, ensure school role templates,');
console.log('migrate legacy staff roles, seed PlanCatalog if empty, and optionally');
console.log('create a platform owner from PLATFORM_OWNER_* env vars.');

const runner = `
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { PermissionsService } = require('../dist/permissions/permissions.service');
const { PlanCatalogService } = require('../dist/subscriptions/plan-catalog.service');
const { PlatformAuthService } = require('../dist/platform/platform-auth.service');

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const permissions = app.get(PermissionsService);
    const plans = app.get(PlanCatalogService);
    const platformAuth = app.get(PlatformAuthService);
    await permissions.runExplicitBootstrap();
    await plans.ensureSeeded();
    const owner = await platformAuth.ensurePlatformOwnerFromEnv();
    console.log(JSON.stringify({ ok: true, platformOwner: owner }, null, 2));
  } finally {
    await app.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

const result = spawnSync(process.execPath, ['-e', runner], {
  cwd: apiRoot,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
