<div align="center">

# 🚀 DecisionOS

### *AI-Powered Business Intelligence & Predictive Analytics Platform for Enterprise & SMEs*

[![Node.js](https://img.shields.io/badge/Node.js-v24-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.6_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Background_Workers-FF6B6B?style=for-the-badge)](https://bullmq.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

[Overview](#-overview) • [Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Frontend Suite](#-frontend-suite) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [API Reference](#-api-reference) • [Test Suite](#-test-suite) • [Security & Multi-Tenancy](#-security--multi-tenancy)

---

</div>

> [!NOTE]
> **DecisionOS** is an enterprise-grade, full-stack, multi-tenant SaaS platform that unifies fragmented operational spreadsheets, sales logs, and ERP datasets into an executive BI cockpit. Powered by **Google Gemini 3.6 Flash** with statistical heuristic fallbacks, **BullMQ** async background workers, automated **PDF/CSV/Excel** report generation, and a **10-page React 19** executive dashboard with Sonner-inspired **Dynamic Island notifications**.

---

## 🌟 Overview

Modern SMEs and growing enterprises frequently suffer from siloed spreadsheets, missed stockouts, unmonitored customer churn, and delayed financial reporting. **DecisionOS** provides a comprehensive, centralized decision intelligence operating system:

- **Full-Stack Enterprise REST API** — Express.js + Prisma ORM + Supabase PostgreSQL with 60+ tested endpoints.
- **Dual-Engine AI Intelligence** — Google Gemini 3.6 Flash coupled with internal anomaly algorithms (Z-score analysis, RFM customer segmentation, linear regression forecasting).
- **Automated Multi-Format Report Builder** — Generates styled PDF, multi-sheet Excel (`.xlsx`), and streaming CSV reports on recurring cron schedules (Daily, Weekly, Monthly) with automated 30-day cloud retention and Resend SMTP delivery.
- **Resilient Data Import Pipeline** — Multer + BullMQ + Redis background workers with fuzzy column detection, row-level error isolation (`PARTIAL` commits), and sample templates.
- **Multi-Tenant Security** — Complete tenant isolation via `organizationId` database scoping, memory-hard Argon2id session authentication, and granular RBAC.
- **High-End Executive UI** — React 19 + Vite with 10 production pages, responsive Recharts financial visualizations, and a floating **Dynamic Island HUD notification pill**.

---

## 🚀 Key Features

<table>
  <tr>
    <td width="50%">
      <h3>📊 Business Data Suite</h3>
      <ul>
        <li><b>Customers CRM</b>: RFM segmentation, customer lifetime revenue (LTV), churn risk detection, and search/sort.</li>
        <li><b>Products Catalogue</b>: SKU uniqueness, unit economics, cost price, and gross margin tracking.</li>
        <li><b>Sales Ledger</b>: Atomic inventory decrement & customer revenue rollups on transaction commits.</li>
        <li><b>Expense Tracking</b>: Multi-category ledger with MoM surge detection and category distribution donut charts.</li>
        <li><b>Inventory Velocity</b>: Reorder alerts, stockout warnings, dynamic progress indicators, and SKU health status.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🧠 AI Engine (Gemini 3.6 Flash)</h3>
      <ul>
        <li><b>Anomaly Detection</b>: Real-time alerts for revenue drops, expense spikes (>25%), and stockout risks.</li>
        <li><b>Churn Risk Matrix</b>: Flags high-value dormant accounts with inactivity >45 days.</li>
        <li><b>Predictive Forecasting</b>: 3-month linear regression forward revenue trajectory.</li>
        <li><b>"Ask DecisionOS"</b>: Natural language Q&A querying live business data across all modules.</li>
        <li><b>Dual-Engine Resiliency</b>: Automatic fallback to internal heuristic statistical engine when offline.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📑 Automated Report Engine</h3>
      <ul>
        <li><b>Vector PDF Reports (PDFKit)</b>: Rendered executive summaries with KPI metric cards, data tables, and alert badges.</li>
        <li><b>Excel Workbooks (ExcelJS)</b>: Multi-sheet <code>.xlsx</code> spreadsheets with styled headers & auto-fit columns.</li>
        <li><b>Streaming CSV</b>: Multi-section CSV exports for fast data ingestion.</li>
        <li><b>Cron Scheduler</b>: Automated Daily, Weekly, and Monthly background triggers.</li>
        <li><b>30-Day Cloud File Retention</b>: Automated daily background purger for expired exports.</li>
        <li><b>Email Delivery</b>: Branded HTML notifications via Resend SMTP with 1-hour signed cloud download URLs.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📥 Data Import Pipeline</h3>
      <ul>
        <li><b>Fuzzy Header Detection</b>: Auto-maps messy column names across all 5 entity types.</li>
        <li><b>Background Ingestion</b>: BullMQ + Redis job worker with exponential backoff.</li>
        <li><b>Error Isolation</b>: Valid rows commit immediately; invalid rows flagged for review (<code>PARTIAL</code> status).</li>
        <li><b>Template Downloads</b>: Pre-formatted CSV sample generators for every model.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🔐 Multi-Tenancy & RBAC</h3>
      <ul>
        <li><b>Strict Tenant Isolation</b>: Every query hard-scoped by <code>organizationId</code>.</li>
        <li><b>Role Permissions</b>: <code>OWNER</code>, <code>ADMIN</code>, <code>ANALYST</code>, <code>VIEWER</code>.</li>
        <li><b>Secure Auth</b>: Memory-hard Argon2id password hashing + HTTP-only signed cookies.</li>
        <li><b>Audit Trail</b>: Immutable audit logging for sensitive data mutations and file exports.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>💎 Executive Cockpit UI</h3>
      <ul>
        <li><b>10 Production Pages</b>: Dashboard, Sales, Expenses, Inventory, Customers, Reports, AI Insights, Data Import, Notifications, Settings.</li>
        <li><b>Dynamic Island HUD Toasts</b>: Floating glassmorphic pill notifications with spring physics.</li>
        <li><b>Live Visualizations</b>: Responsive Recharts line, area, and stacked bar graphs.</li>
        <li><b>Theme Engine</b>: Dark and Light modes with automatic OS system preference detection.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 19 + Vite 8)"]
        UI["10 Production Pages\n(Dashboard, Sales, Expenses, Inventory, CRM, Reports, AI, Import, Settings, Auth)"]
        Toast["Dynamic Island Toast HUD"]
        Charts["Recharts Visualizations"]
    end

    subgraph API["Backend (Express.js + Node.js)"]
        Auth["Auth & RBAC Middleware"]
        Tenant["Organization Context Middleware"]
        Modules["12 Core Business Modules"]
        AIEngine["AI Engine Service"]
        ImportSvc["Data Import Service"]
        ReportSvc["Report Generation Service"]
    end

    subgraph Workers["Background Workers (BullMQ + Redis)"]
        ImportWorker["Import Worker"]
        ReportWorker["Report Worker"]
        ReportScheduler["5-Min Cron Scheduler"]
        Purger["30-Day Storage Purger"]
    end

    subgraph AI["AI Reasoning Layer"]
        Gemini["Google Gemini 3.6 Flash"]
        Fallback["Statistical Heuristic Engine"]
    end

    subgraph Infra["Cloud Infrastructure"]
        PG[("PostgreSQL - Supabase")]
        Redis[("Redis - Upstash")]
        Storage["Supabase Cloud Storage"]
        Email["Resend SMTP Email"]
    end

    UI --> Auth --> Tenant --> Modules
    Modules --> PG
    Modules --> AIEngine
    AIEngine --> Gemini
    AIEngine --> Fallback
    ImportSvc --> Redis --> ImportWorker --> PG
    ReportSvc --> Storage
    ReportScheduler --> Redis --> ReportWorker --> ReportSvc
    ReportWorker --> Email
    Purger --> Storage
```

---

## 🖥️ Frontend Suite

The frontend is built with **React 19** and **Vite 8**, featuring 10 production-ready, fully responsive pages connected via a central Axios client (`src/lib/api.js`) with session cookie credentials:

| Page | Route | Features & Capabilities |
|---|---|---|
| **Dashboard** | `/dashboard` | Executive cockpit with 4 key KPI cards, Revenue Trend chart, Expense Breakdown, Top Customers, and AI quick insights. |
| **Sales** | `/sales` | Paginated sales transactions ledger with total revenue summaries, product search, and status badges. |
| **Expenses** | `/expenses` | Expense tracking with category donut breakdown, monthly averages, and category filters. |
| **Inventory** | `/inventory` | SKU stock control, dynamic stock-level progress bars, low-stock warnings, and unit cost rollups. |
| **Customers** | `/customers` | CRM directory with customer lifetime revenue, order counts, RFM rankings, and search/sort. |
| **Reports** | `/reports` | 3-tab report center for on-demand generation (PDF/Excel/CSV), export history with signed downloads, and automated cron schedules. |
| **AI Insights** | `/insights` | Predictive insights dashboard with Business Health Score (0-100), risk filters, and natural language Q&A. |
| **Data Import** | `/import` | Drag-and-drop CSV/XLSX file uploader with fuzzy column detection, 5-row preview, sample templates, and progress polling. |
| **Notifications** | `/notifications` | Live notification inbox with unread count badges and filterable alert types. |
| **Settings** | `/settings` | 5-tab settings console: Profile editing, Organization details, Notification toggles, Theme switcher, and Session termination. |
| **Auth Suite** | `/login`, `/register` | Multi-step onboarding with profile photo upload, password complexity validation, and animated brand identity. |

---

## 🛠️ Tech Stack

### Backend
| Component | Technology | Version | Purpose |
|---|---|:---:|---|
| **Runtime** | Node.js | v24 | High-performance JavaScript runtime |
| **Framework** | Express.js | 4.x | HTTP REST API & middleware |
| **ORM** | Prisma | 5.22 | Type-safe PostgreSQL client & migrations |
| **Primary Database** | PostgreSQL (Supabase) | 15+ | Relational multi-tenant data store |
| **Queue / Cache** | Redis (Upstash) | — | BullMQ job queue & distributed locks |
| **Background Jobs** | BullMQ | 6.x | Async worker queues for imports, reports, & file purging |
| **AI LLM** | Google Gemini | 3.6 Flash | Predictive analytics & natural language Q&A |
| **PDF Generation** | PDFKit | 0.19 | Programmatic vector PDF reports |
| **Excel Generation** | ExcelJS | 4.4 | Formatted multi-sheet spreadsheets (`.xlsx`) |
| **CSV Generation** | @fast-csv/format | 5.0 | Streaming CSV serialization |
| **Email Delivery** | Nodemailer + Resend | 9.x | Branded HTML transactional emails |
| **Password Hashing**| Argon2 | 0.45 | Memory-hard Argon2id password hashing |
| **Validation** | Zod | 4.x | Strict runtime request schema validation |
| **Security** | Helmet + RateLimit | — | Secure HTTP headers & brute-force protection |

### Frontend
| Component | Technology | Version | Purpose |
|---|---|:---:|---|
| **Framework** | React | 19 | UI component architecture |
| **Build Tool** | Vite | 8.x | High-speed HMR development & build |
| **Styling** | Vanilla CSS + Design Tokens | — | Custom glassmorphism, responsive grid, & CSS custom properties |
| **Charts** | Recharts | 3.x | Financial charts, revenue trends, & expense distributions |
| **HTTP Client** | Axios | 1.x | REST API integration with `withCredentials: true` |
| **Icons** | Lucide React | — | Modern SVG iconography |
| **Notifications** | react-hot-toast + Custom HUD | — | Sonner-inspired floating Dynamic Island pill toasts |

---

## 📂 Project Structure

```
DecisionOS/
├── 📂 backend/
│   ├── 📂 prisma/
│   │   ├── schema.prisma              # Database schema (8 modules, 20+ models)
│   │   ├── migrations/                # Schema migrations (including file retention)
│   │   └── seed.js                    # Plan tiers & super-admin seed script
│   ├── 📂 src/
│   │   ├── 📂 config/
│   │   │   ├── env.js                 # Validated environment variables (Zod)
│   │   │   ├── gemini.js              # Google Gemini 3.6 Flash client & fallback
│   │   │   ├── queue.js               # BullMQ queue configurations
│   │   │   └── redis.js               # Redis connection singleton
│   │   ├── 📂 lib/
│   │   │   ├── aiContextBuilder.js    # Multi-tenant AI metrics aggregator
│   │   │   ├── anomalyDetector.js     # Statistical anomaly detection algorithms
│   │   │   ├── columnDetector.js      # Fuzzy header matcher for imports
│   │   │   ├── crypto.js              # Secure token generator
│   │   │   ├── email.js               # Resend SMTP email delivery
│   │   │   ├── fileParser.js          # CSV & Excel streaming parser
│   │   │   ├── forecaster.js          # Linear regression revenue forecaster
│   │   │   ├── prisma.js              # Prisma client singleton
│   │   │   ├── 📂 reportBuilder/      # Report generation engine
│   │   │   │   ├── csvBuilder.js      # Multi-section CSV builder
│   │   │   │   ├── pdfBuilder.js      # PDFKit vector PDF builder
│   │   │   │   ├── reportDataFetcher.js # Cross-module context aggregator
│   │   │   │   └── xlsxBuilder.js     # ExcelJS multi-sheet formatted workbook
│   │   │   ├── response.js            # Standardized API response envelope
│   │   │   └── templateGenerator.js   # Sample CSV template generator
│   │   ├── 📂 middleware/
│   │   │   ├── auth.middleware.js     # Session cookie verification
│   │   │   ├── org.middleware.js      # Tenant context injection
│   │   │   ├── rbac.middleware.js     # Permission-based access gate
│   │   │   ├── rateLimit.middleware.js # Express rate limiters
│   │   │   └── errorHandler.js        # Global error interceptor
│   │   ├── 📂 modules/
│   │   │   ├── 📂 ai/                 # AI Engine (insights, forecasting, ask)
│   │   │   ├── 📂 analytics/          # Executive P&L & chart aggregations
│   │   │   ├── 📂 auth/               # Registration, login, sessions
│   │   │   ├── 📂 customers/          # Customer CRM & RFM scoring
│   │   │   ├── 📂 expenses/           # Expense ledger & surge alerts
│   │   │   ├── 📂 imports/            # Data import pipeline & preview
│   │   │   ├── 📂 inventory/          # Stock control & reorder tracking
│   │   │   ├── 📂 invitations/        # Team invitation system
│   │   │   ├── 📂 members/            # Team member roles & permissions
│   │   │   ├── 📂 organizations/      # Multi-tenant organization manager
│   │   │   ├── 📂 products/           # Product catalogue & margins
│   │   │   ├── 📂 reports/            # Automated Report Generation & cleanup
│   │   │   └── 📂 sales/              # Sales transactions with inventory decrements
│   │   ├── 📂 workers/
│   │   │   ├── import.worker.js       # BullMQ import queue processor
│   │   │   ├── report.worker.js       # BullMQ report queue processor
│   │   │   ├── report.scheduler.js    # 5-minute cron scheduler & daily cleanup
│   │   │   └── 📂 processors/         # Entity batch processors
│   │   ├── app.js                     # Express app configuration
│   │   └── server.js                  # Server entry & graceful shutdown
│   ├── 📂 test/
│   │   ├── business_data.test.js      # 19 tests — Business Data Suite
│   │   ├── import_pipeline.test.js    # 13 tests — Import Pipeline & BullMQ
│   │   ├── ai_engine.test.js          # 14 tests — AI Engine & Anomaly Detection
│   │   └── reports.test.js            # 17 tests — Automated Report Generation
│   └── package.json
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 components/
│   │   │   ├── 📂 layout/             # AppLayout, Sidebar, ProtectedRoute
│   │   │   └── 📂 ui/                 # CustomToast (Dynamic Island HUD), StatCards
│   │   ├── 📂 context/                # AuthContext, ThemeContext, NotificationContext
│   │   ├── 📂 lib/                    # Central Axios API instance & custom hooks
│   │   │   ├── api.js                 # Base Axios configuration
│   │   │   └── 📂 hooks/              # useApi, useDashboard, useAI, useReports
│   │   ├── 📂 pages/                  # 10 production pages + Auth suite
│   │   ├── App.jsx                    # Routing & global providers
│   │   └── index.css                  # Global design system & theme tokens
│   └── package.json
│
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher (v24 recommended)
- **PostgreSQL**: PostgreSQL 15+ (or free [Supabase](https://supabase.com) instance)
- **Redis**: Redis 6+ (or free [Upstash](https://upstash.com) Redis)
- **Google Gemini API Key**: Free from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/souvikx18/DecisionOS.git
cd DecisionOS
```

### 2. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173

# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# Redis (Upstash)
REDIS_URL="rediss://default:<password>@<host>.upstash.io:6379"

# Auth
COOKIE_SECRET="super-secret-random-32-byte-hex-string-here"
SESSION_TTL_SECONDS=604800

# Supabase Storage
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
STORAGE_BUCKET=decisionos-files

# Email (Resend SMTP)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=decisionos@resend.dev

# AI Engine
AI_PROVIDER=gemini
GEMINI_API_KEY=<your-gemini-api-key>

# Retention & Export Settings
REPORT_FILE_RETENTION_DAYS=30
```

### 3. Initialize the Database

```bash
# Install backend dependencies
npm install

# Push Prisma schema to Supabase & generate client
npm run db:push

# Seed billing tiers & initial administrator
npm run db:seed
```

### 4. Run the Backend

```bash
npm run dev
# Server listening on http://localhost:3001
# BullMQ Import & Report Workers + Schedulers automatically initialize
```

### 5. Run the Frontend

```bash
cd ../frontend
npm install
npm run dev
# Frontend live at http://localhost:5173
```

---

## 🔑 Quick Demo Credentials

For rapid local testing and evaluation:

| Parameter | Demo Value |
|---|---|
| **URL** | `http://localhost:5173/login` |
| **Email** | `test@decisionos.com` |
| **Password** | `Password123!` |
| **Organization** | `Acme Test Corp` |
| **Role** | `OWNER` |

---

## 📡 API Reference

All endpoints are versioned under `/api/v1` and use session-cookie authentication with credentials.

### Authentication (`/auth`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `POST` | `/auth/signup` | Public | Register new user account |
| `POST` | `/auth/login` | Public | Authenticate user & set HTTP-only session cookie |
| `POST` | `/auth/logout` | Authenticated | Terminate session & clear cookies |
| `POST` | `/auth/logout-all` | Authenticated | Terminate all active sessions across devices |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile & org list |
| `POST` | `/auth/change-password` | Authenticated | Change user password |

### Business Data Suite
| Method | Endpoint | Required Role | Description |
|---|---|:---:|---|
| `GET` | `/customers` | `VIEW_DATA` | List customers (paginated, searchable, sorted) |
| `POST` | `/customers` | `MANAGE_DATA` | Create new customer with RFM parameters |
| `GET` | `/customers/:id` | `VIEW_DATA` | Get customer details + lifetime value |
| `PATCH` | `/customers/:id` | `MANAGE_DATA` | Update customer details |
| `DELETE` | `/customers/:id` | `MANAGE_DATA` | Archive customer |
| `GET` | `/products` | `VIEW_DATA` | List product catalogue with margin rollups |
| `POST` | `/products` | `MANAGE_DATA` | Create product (enforces unique SKU) |
| `GET` | `/sales` | `VIEW_DATA` | List sales ledger with filtering |
| `POST` | `/sales` | `MANAGE_DATA` | Record sale (atomic inventory decrement & customer LTV sync) |
| `GET` | `/expenses` | `VIEW_DATA` | List expense records with category filter |
| `GET` | `/expenses/categories` | `VIEW_DATA` | Category breakdown totals |
| `POST` | `/expenses` | `MANAGE_DATA` | Record new expense |
| `GET` | `/inventory` | `VIEW_DATA` | List inventory with stockout & reorder warnings |
| `PATCH` | `/inventory/:id/adjust` | `MANAGE_DATA` | Adjust stock quantity |

### Analytics (`/analytics`)
| Method | Endpoint | Required Role | Description |
|---|---|:---:|---|
| `GET` | `/analytics/summary` | `VIEW_DATA` | Executive P&L summary & business health |
| `GET` | `/analytics/charts/revenue-trend` | `VIEW_DATA` | 6-month monthly revenue & profit trend |
| `GET` | `/analytics/charts/expense-breakdown` | `VIEW_DATA` | Category-wise expense distribution |

### AI Engine (`/ai`)
| Method | Endpoint | Required Role | Description |
|---|---|:---:|---|
| `POST` | `/ai/generate` | `VIEW_DATA` | Trigger full AI anomaly & insight scan |
| `GET` | `/ai/insights` | `VIEW_DATA` | List insights with severity/type filters |
| `GET` | `/ai/insights/summary` | `VIEW_DATA` | Business health score (0–100) & risk count |
| `PATCH` | `/ai/insights/:id/read` | `VIEW_DATA` | Mark insight as read |
| `PATCH` | `/ai/insights/:id/dismiss` | `VIEW_DATA` | Dismiss insight from active cockpit |
| `POST` | `/ai/ask` | `VIEW_DATA` | Ask natural language questions against live data |
| `GET` | `/ai/forecast/revenue` | `VIEW_DATA` | 3-month predictive revenue forecast |

### Automated Reports & Schedules (`/reports`)
| Method | Endpoint | Required Role | Description |
|---|---|:---:|---|
| `POST` | `/reports/generate` | `MANAGE_DATA` | Trigger on-demand report (PDF/CSV/XLSX) |
| `GET` | `/reports` | `VIEW_DATA` | List generated reports with pagination & filters |
| `GET` | `/reports/:id` | `VIEW_DATA` | Get report metadata and export formats |
| `GET` | `/reports/:id/download/:exportId` | `VIEW_DATA` | Generate 1-hour signed cloud download URL |
| `DELETE` | `/reports/:id` | `MANAGE_DATA` | Delete report record & purge cloud storage files |
| `POST` | `/reports/schedules` | `MANAGE_DATA` | Create recurring schedule (Daily/Weekly/Monthly) |
| `GET` | `/reports/schedules` | `VIEW_DATA` | List all active automated report schedules |
| `PATCH` | `/reports/schedules/:id` | `MANAGE_DATA` | Update schedule recipients, frequency, or toggle active |
| `DELETE` | `/reports/schedules/:id` | `MANAGE_DATA` | Delete recurring report schedule |

### Data Import Pipeline (`/imports`)
| Method | Endpoint | Required Role | Description |
|---|---|:---:|---|
| `POST` | `/imports/upload` | `MANAGE_DATA` | Upload CSV/XLSX file (20MB max) |
| `POST` | `/imports/preview` | `MANAGE_DATA` | Extract 5-row preview & detect columns |
| `POST` | `/imports/:id/start` | `MANAGE_DATA` | Queue BullMQ background import job |
| `GET` | `/imports/:id/status` | `VIEW_DATA` | Poll import progress & valid/error row counts |
| `GET` | `/imports/templates/:type` | `VIEW_DATA` | Download pre-formatted CSV sample template |

---

## 🧪 Test Suite

DecisionOS includes an extensive end-to-end integration test suite executed against live PostgreSQL, Redis, and Express instances:

```bash
cd backend

# Execute all integration test suites
node test/business_data.test.js      # Business Data Suite (19 tests)
node test/import_pipeline.test.js    # Data Import Pipeline (13 tests)
node test/ai_engine.test.js          # AI Engine & Anomaly Detection (14 tests)
node test/reports.test.js            # Automated Report Generation (17 tests)
```

### Test Verification Summary

| Test Suite | File | Tests Passed | Assertions | Status |
|---|---|:---:|:---:|:---:|
| **Business Data** | `test/business_data.test.js` | 19 / 19 | 19 | ✅ **100% PASSED** |
| **Data Import Pipeline** | `test/import_pipeline.test.js` | 13 / 13 | 13 | ✅ **100% PASSED** |
| **AI Engine & Analytics** | `test/ai_engine.test.js` | 14 / 14 | 14 | ✅ **100% PASSED** |
| **Automated Report Engine** | `test/reports.test.js` | 17 / 17 | 43 | ✅ **100% PASSED** |
| **Total Integration Coverage** | **All Modules** | **63 / 63** | **89** | ✅ **100% PASSED** |

---

## 🛡️ Security & Multi-Tenancy

```
Multi-Tenant Security Architecture:
┌────────────────────────────────────────────────────────┐
│ Incoming Request (HTTP Cookie + X-Organization-ID)     │
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ 1. Auth Middleware: Verify Argon2 session token in DB  │
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ 2. Org Middleware: Validate user membership in target  │
│    organization and inject `req.org` & `req.user`      │
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ 3. RBAC Middleware: Check role (OWNER/ADMIN/ANALYST)  │
│    against required permission (e.g. `MANAGE_DATA`)    │
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ 4. Service / ORM Layer: Prisma queries enforce         │
│    `WHERE organizationId = req.org.id`                 │
│    (Cross-tenant leakage is architecturally impossible)│
└─────────────────────────┬──────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ 5. Audit Logger: Non-repudiable logs of mutations     │
└────────────────────────────────────────────────────────┘
```

- **Password Security**: Argon2id with random salts (memory-hard, GPU-resistant).
- **Session Protection**: HTTP-only, SameSite strict signed cookies.
- **Strict Tenant Boundary**: All database indexes, unique constraints, and queries are scoped by `organizationId`.
- **Brute Force Protection**: IP and user-rate limiting on authentication and sensitive endpoints.
- **Security Headers**: Helmet CSP, HSTS, X-Content-Type-Options, X-Frame-Options.
- **Audit Trails**: Non-repudiable audit logging for data mutations and file exports.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

Built with precision for Modern Enterprise & SME Decision Makers.

**DecisionOS** — *Turn data into decisions.*

</div>
