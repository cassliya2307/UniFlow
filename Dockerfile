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

# Create directories (will be fixed at runtime by entrypoint for Railway volume compatibility)
RUN mkdir -p /app/uploads /data /data/uploads

# Add entrypoint script for runtime permission setup
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server/dist/index.js"]