FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/*/package*.json ./packages/

RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN ./apps/api/node_modules/.bin/prisma generate \
    --schema=./apps/api/prisma/schema.prisma

RUN npm run build --workspace apps/api

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Root workspace dependencies
COPY --from=build /app/node_modules ./node_modules

# API dependencies, including Prisma Client
RUN mkdir -p /app/node_modules/@prisma

COPY --from=build /app/apps/api/node_modules/@prisma/client \
    /app/node_modules/@prisma/client

COPY --from=build /app/apps/api/node_modules/.prisma \
    /app/node_modules/.prisma

# Compiled API
COPY --from=build /app/apps/api/dist ./dist

# Prisma schema
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main.js"]
