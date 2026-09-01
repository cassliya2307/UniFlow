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

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Serve the built React app as a static SPA
# Falls back to index.html for any route (SPA routing)
# The proxy in vite.config.dev routes /api to the backend
CMD ["npx", "vite", "preview", "--port", "${PORT:-3000}", "--host", "--strictPort"]