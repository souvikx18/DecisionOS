# DecisionOS — Production Deployment & Operations Guide

Enterprise-grade deployment runbook for DecisionOS (Multi-Tenant AI-Powered Business Intelligence Platform).

---

## 1. Architecture Overview

```
[ Internet Users ]
       │ HTTPS (:443)
       ▼
[ Cloudflare / Load Balancer / Nginx ]
       ├── /assets/* (Static Assets, Immutable Cache 1y)
       ├── /* (React SPA, no-cache index.html)
       ├── /api/v1/* (Reverse Proxy -> Express API)
       └── /ws (WebSocket Upgrade -> Realtime Hub)
                │
         [ Express Backend ]
         ├── Multi-Stage Cluster (PM2 / Docker)
         ├── Rate Limiting (Redis-backed)
         ├── Response Compression (Gzip)
         ├── RLS-isolated PostgreSQL queries
         └── BullMQ Workers (Async data imports & report engine)
                │
       ┌────────┴────────┐
       ▼                 ▼
[ PostgreSQL 16 ]   [ Redis 7 ]
(Persistent DB)    (Cache, Sessions, Queues)
```

---

## 2. Environment Variables Checklist

Ensure these variables are set in your production environment (never commit `.env` to Git):

### Backend (`backend/.env`)
| Variable | Production Value / Format | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables error masking, secure cookies, and structured JSON logs |
| `PORT` | `5000` (Docker) or `3001` (Bare metal) | HTTP server port |
| `API_URL` | `https://api.yourdomain.com` | Public backend URL |
| `FRONTEND_URL` | `https://app.yourdomain.com` | Public frontend URL |
| `ALLOWED_ORIGINS`| `https://app.yourdomain.com` | Strict CORS whitelist |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/decisionos?sslmode=require` | Supabase or AWS RDS connection |
| `REDIS_URL` | `redis://:password@host:6379` | Upstash, Redis Cloud, or Docker Redis |
| `COOKIE_SECRET` | 64+ char random hex string | Session cookie signing |
| `SUPABASE_URL` | `https://xyz.supabase.co` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | Client upload authentication |
| `SUPABASE_SERVICE_KEY`| Supabase Service Role Key | Server file operations |
| `STORAGE_BUCKET` | `decisionos-files` | Storage bucket name |
| `AI_PROVIDER` | `gemini` (or `openai`) | AI recommendation engine |
| `GEMINI_API_KEY` | Google AI Studio Key | Gemini 1.5 Flash API Key |
| `RESEND_API_KEY` | `re_...` | Resend transactional email API key |
| `EMAIL_FROM` | `DecisionOS <support@yourdomain.com>` | Verified sender email |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | Razorpay Live Key ID |
| `RAZORPAY_KEY_SECRET` | Live Secret | Razorpay Live Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Live Webhook Secret | Razorpay HMAC verification secret |
| `SUPER_ADMIN_EMAIL`| `admin@yourdomain.com` | System administrator account |

### Frontend (`frontend/.env`)
| Variable | Production Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api/v1` (if proxied) or `https://api.yourdomain.com/api/v1` | Axios backend API endpoint |
| `VITE_WS_URL` | `/ws` (if proxied) or `wss://api.yourdomain.com/ws` | Real-time WebSocket connection |
| `VITE_SUPABASE_URL` | `https://xyz.supabase.co` | Supabase Client Upload URL |
| `VITE_SUPABASE_ANON_KEY` | Public Anon Key | Supabase client auth token |

---

## 3. Deployment Options

### Option A: Complete Docker Compose Stack (Recommended)
DecisionOS includes a multi-stage production Docker Compose stack with PostgreSQL, Redis, Node.js Backend, and Nginx Reverse Proxy.

```bash
# 1. Copy environment template
cp .env.docker.example .env

# 2. Fill in production secrets in .env
nano .env

# 3. Build and launch containers in background
docker compose up -d --build

# 4. Run database migrations
docker compose exec backend npx prisma migrate deploy

# 5. Check health status
curl http://localhost/health
```

### Option B: Cloud PaaS (Vercel + Render / Railway)

#### Frontend (Vercel / Cloudflare Pages)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: `VITE_API_URL`, `VITE_WS_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

#### Backend (Render / Railway / AWS App Runner)
- **Root Directory**: `backend`
- **Build Command**: `npm ci && npx prisma generate`
- **Start Command**: `node src/server.js`
- **Environment Variables**: All Backend variables from Section 2.

### Option C: Bare-Metal / Ubuntu VM with PM2

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Prepare backend
cd backend
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy

# 3. Start cluster with PM2
pm2 start ecosystem.config.cjs --env production

# 4. Save PM2 startup list to launch on system reboot
pm2 save
pm2 startup

# 5. Build frontend static assets
cd ../frontend
npm ci
npm run build
# Copy dist/ to your web server root (/var/www/decisionos)
```

---

## 4. Health Checks & Monitoring

The backend exposes standardized health endpoints for load balancers and orchestrators:

* **Liveness Probe**: `GET /health/live`
  * Returns `200 OK` `{ "status": "alive" }`
  * Verifies Express process is alive and responsive.
* **Readiness Probe**: `GET /health` or `GET /health/ready`
  * Returns `200 OK` when PostgreSQL and Redis are both connected.
  * Returns `503 Service Unavailable` if either service is degraded.

---

## 5. Security & Maintenance Best Practices

1. **SSL/TLS**: Terminate TLS at Nginx, Cloudflare, or AWS ALB with HTTP/2 and modern ciphers.
2. **Database Backups**: Schedule daily automated backups with `pg_dump`:
   ```bash
   pg_dump -Fc -U decisionos -d decisionos > "backup_$(date +%F).dump"
   ```
3. **Database Migrations**: Always execute `npx prisma migrate deploy` in production pipelines before starting new backend instances.
4. **Zero-Downtime Reloads**: When deploying updates with PM2:
   ```bash
   pm2 reload ecosystem.config.cjs --update-env
   ```
