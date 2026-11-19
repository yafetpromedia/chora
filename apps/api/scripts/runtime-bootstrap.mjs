/**
 * Explicit, opt-in runtime catalog/owner bootstrap.
 *
 * NEVER run automatically on API startup. NEVER run against production
 * unless an operator has reviewed docs/PRODUCTION_STARTUP_SAFETY.md and
 * intentionally set the allow flag for a disposable or approved target.
 *
 * Usage (from apps/api or repo root via npm workspace):
 *   CHORA_ALLOW_RUNTIME_BOOTSTRAP=1 DATABASE_URL=postgresql://… \
 *     node ./scripts/runtime-bootstrap.mjs
 *
 * Optional platform owner (only if both set AND user missing):
 *   PLATFORM_OWNER_EMAIL / PLATFORM_OWNER_PASSWORD
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distRoot = path.join(apiRoot, 'dist');

const modulePaths = {
  appModule: path.join(distRoot, 'app.module.js'),
  permissions: path.join(distRoot, 'permissions', 'permissions.service.js'),
  planCatalog: path.join(distRoot, 'subscriptions', 'plan-catalog.service.js'),
  platformAuth: path.join(distRoot, 'platform', 'platform-auth.service.js'),
};

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

for (const [label, filePath] of Object.entries(modulePaths)) {
  if (!fs.existsSync(filePath)) {
    console.error(
      `Refusing to run: missing built module (${label}) at ${filePath}. Run API build first.`,
    );
    process.exit(1);
  }
}

const dbName = (() => {
  try {
    return new URL(process.env.DATABASE_URL)
      .pathname.replace(/^\//, '')
      .split('?')[0];
  } catch {
    return '(unparseable)';
  }
})();

console.log(`Runtime bootstrap target database name: ${dbName}`);
console.log(
  'This will upsert permission catalog rows, ensure school role templates,',
);
console.log(
  'migrate legacy staff roles, seed PlanCatalog if empty, and optionally',
);
console.log('create a platform owner from PLATFORM_OWNER_* env vars.');

// Embed absolute paths so nested requires never depend on cwd-relative ../dist.
const abs = Object.fromEntries(
  Object.entries(modulePaths).map(([k, v]) => [k, path.resolve(v)]),
);

const runner = `
const { createRequire } = require('module');
const requireFromApi = createRequire(${JSON.stringify(path.join(apiRoot, 'package.json'))});
const { NestFactory } = requireFromApi('@nestjs/core');
const { AppModule } = require(${JSON.stringify(abs.appModule)});
const { PermissionsService } = require(${JSON.stringify(abs.permissions)});
const { PlanCatalogService } = require(${JSON.stringify(abs.planCatalog)});
const { PlatformAuthService } = require(${JSON.stringify(abs.platformAuth)});

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
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
