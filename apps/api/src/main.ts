import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';

type CorsOriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

function allowDevLanOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname.startsWith('192.168.')) return true;
    if (hostname.startsWith('10.')) return true;
    return /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';
  const webAppUrl = process.env.WEB_APP_URL?.trim().replace(/\/$/, '') || '';

  if (isProduction && !webAppUrl) {
    throw new Error(
      'WEB_APP_URL must be set in production (exact frontend origin, e.g. https://chora.awuddigitals.com).',
    );
  }

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // School settings can include several image data-URLs (logo, signature, stamp, cover).
  app.use(json({ limit: '40mb' }));
  app.use(urlencoded({ extended: true, limit: '40mb' }));
  app.use(
    (
      err: { type?: string; status?: number; message?: string },
      _req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } },
      next: (error?: unknown) => void,
    ) => {
      if (err?.type === 'entity.too.large' || err?.status === 413) {
        res.status(413).json({
          statusCode: 413,
          message:
            'Upload is too large. Use smaller images for logo, signature, stamp, or cover.',
        });
        return;
      }
      next(err);
    },
  );

  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
  ];

  const productionOrigin: CorsOriginCallback = (origin, callback) => {
    // Same-origin browser calls via nginx often omit Origin; allow those.
    if (!origin || origin === webAppUrl) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };

  const developmentOrigin: CorsOriginCallback = (origin, callback) => {
    if (
      !origin ||
      (webAppUrl && origin === webAppUrl) ||
      devOrigins.includes(origin) ||
      allowDevLanOrigin(origin)
    ) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };

  app.enableCors({
    origin: isProduction ? productionOrigin : developmentOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT?.trim() || 3001);
  // Bind loopback in production so only nginx (or local tooling) can reach the API.
  const host =
    process.env.HOST?.trim() || (isProduction ? '127.0.0.1' : '0.0.0.0');
  await app.listen(port, host);
  logger.log(`API listening on http://${host}:${port}`);
}
void bootstrap();
