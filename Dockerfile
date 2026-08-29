FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/

RUN npm ci --include=optional

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (needs schema)
WORKDIR /app/server
RUN npx prisma generate

# Build server
WORKDIR /app/server
RUN npm run build

# Build client
WORKDIR /app/client
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

# Copy deps (keep prod+dev for MVP simplicity - ensures workspace hoisting works)
COPY --from=builder /app/node_modules ./node_modules

# Copy client build
COPY --from=builder /app/client/dist ./client/dist

# Copy root package.json
COPY --from=builder /app/package.json ./

# Create uploads directories writable by app user and fix prisma permissions
# /app/uploads for local Docker Compose, /data for Railway Volume
RUN mkdir -p /app/uploads /data /data/uploads && chown -R nextjs:nodejs /app/uploads /data /app/server/prisma
RUN mkdir -p /app/server/prisma && chown -R nextjs:nodejs /app/server/prisma
RUN chown -R nextjs:nodejs /app/node_modules/@prisma /app/node_modules/.prisma 2>&1 | head -5 || true

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["sh", "-c", "mkdir -p ${UPLOAD_DIR:-/app/uploads} && mkdir -p $(dirname ${DATABASE_URL#file:}) 2>/dev/null || true; npx prisma migrate deploy --schema=./server/prisma/schema.prisma && node server/dist/index.js"]
