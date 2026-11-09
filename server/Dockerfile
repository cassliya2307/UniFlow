FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --include=optional

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY server/node_modules ./server/node_modules

# Generate Prisma client (needs schema)
WORKDIR /app/server
RUN ./node_modules/.bin/prisma generate

# Copy generated Prisma Client to root node_modules for runtime
RUN cp -r server/node_modules/@prisma/client /app/node_modules/@prisma/client

# Build server
WORKDIR /app/server
RUN npm run build

# Production image, copy all the files and run server
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy server compiled
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/prisma ./server/prisma

# Copy node_modules (includes Prisma Client, CLI, and all runtime deps)
COPY --from=builder /app/node_modules ./node_modules

# Create directories for Railway volume compatibility
RUN mkdir -p /app/uploads /data /data/uploads

# Add entrypoint script for runtime permission setup
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server/dist/index.js"]