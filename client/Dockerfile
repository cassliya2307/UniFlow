FROM node:20-alpine AS builder
WORKDIR /app

COPY client/package.json package-lock.json* ./
RUN npm ci

COPY client/ .

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist ./client/dist

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD ["npx", "vite", "preview", "--port", "${PORT:-3000}", "--host", "--strictPort"]