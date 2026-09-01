FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json

RUN npm ci --workspace=client

COPY client/ ./client/

RUN npm run build --workspace=client

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/vite.config.ts ./client/vite.config.ts
COPY --from=builder /app/node_modules ./node_modules

ENV PATH=/node_modules/.bin:$PATH

EXPOSE 3000

ENV NODE_ENV=production

# Serve the built React app as a static SPA
# Falls back to index.html for any route (SPA routing)
CMD ["sh", "-c", "npx vite preview --config client/vite.config.ts --host 0.0.0.0 --port ${PORT:-8080}"]