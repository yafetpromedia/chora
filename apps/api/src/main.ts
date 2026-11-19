import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

type CorsOriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

async function bootstrap() {
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
  const staticOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
  ];
  const webAppUrl = process.env.WEB_APP_URL?.trim();
  if (webAppUrl && !staticOrigins.includes(webAppUrl)) {
    staticOrigins.push(webAppUrl);
  }

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

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? staticOrigins
        : (((origin, callback) => {
            if (
              !origin ||
              staticOrigins.includes(origin) ||
              allowDevLanOrigin(origin)
            ) {
              callback(null, true);
              return;
            }
            callback(null, false);
          }) satisfies CorsOriginCallback),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
