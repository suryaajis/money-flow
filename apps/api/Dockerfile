# Build dari root monorepo, bukan dari apps/api/
FROM node:20-alpine AS builder
WORKDIR /app

# Copy lockfile dan package.json dari ROOT monorepo
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

RUN npm ci

# Copy semua source
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY apps/api/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main"]