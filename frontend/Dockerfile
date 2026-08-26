# ============================================================
# DecisionOS Frontend — Production Multi-Stage Dockerfile
# ============================================================

# ── Stage 1: Build React/Vite SPA ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# ── Stage 2: Serve via Nginx Alpine ──
FROM nginx:1.27-alpine AS runner

# Remove default nginx configs
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom reverse proxy & SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
