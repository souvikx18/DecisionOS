# ============================================================
# DecisionOS Backend — Production Multi-Stage Dockerfile
# ============================================================

# ── Stage 1: Build & Dependencies ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma engines
RUN apk add --no-cache openssl libc6-compat

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies including devDependencies for Prisma generate
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# ── Stage 2: Production Runtime ──
FROM node:20-alpine AS runner

WORKDIR /app

# Install openssl and dumb-init for proper PID 1 signal forwarding
RUN apk add --no-cache openssl libc6-compat dumb-init

ENV NODE_ENV=production
ENV PORT=5000

# Copy node_modules & generated prisma client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Copy source code and scripts
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Fix permissions for execution and entrypoint
RUN chmod +x ./docker-entrypoint.sh && \
    chown -R node:node /app

# Run as non-root user
USER node

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
