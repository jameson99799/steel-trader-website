# ============================================================
# SunSea Steel Website - Production Dockerfile
# Multi-stage: builder (full deps) + runner (prod only)
# ============================================================

# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production runtime (smaller image)
FROM node:20-alpine AS runner
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --silent

# Copy built frontend and server code
COPY --from=builder /app/dist ./dist
COPY server ./server

# Create persistent directories
RUN mkdir -p data uploads logs

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health 2>/dev/null || exit 1

CMD ["node", "server/index.js"]
