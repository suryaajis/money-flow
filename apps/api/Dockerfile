FROM node:20-alpine AS builder
WORKDIR /app

# Copy dari ROOT monorepo (workspace config)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dari root agar workspace hoisting berjalan
RUN npm install

# Copy source api
COPY apps/api ./apps/api

# Build
WORKDIR /app/apps/api
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/src ./src
COPY apps/api/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main"]