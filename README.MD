# DecisionOS 🚀
> **AI-Powered Business Intelligence Platform for Small & Medium Businesses**

DecisionOS is an all-in-one AI platform designed for business owners in manufacturing, retail, distribution, and service industries. It unifies scattered business data (Excel/CSV, CRM, inventory logs, sales reports) to provide real-time executive dashboards, predictive alerts, and actionable decision recommendations.

---

## 🌟 Key Features

- **📊 Real-Time Executive Dashboard**: High-level visibility into total revenue, monthly sales trends, operating expenses, inventory status, and top customer rankings.
- **🧠 AI Insights & Predictive Analytics**:
  - **Sales Intelligence**: Automatically identifies revenue drops and pinpoints root causes (e.g., product line underperformance).
  - **Customer Churn Alert**: Flags inactive accounts before they churn with AI-powered re-engagement recommendations.
  - **Inventory Stockout Forecasting**: Predicts when item stock will run out and suggests purchase order (PO) creation dates.
  - **Expense Anomaly Detection**: Highlights cost overruns and unusual category spending in real time.
- **📥 Flexible Data Import**: Drag-and-drop CSV/Excel import for Sales Data, Inventory Registers, and Expense Logs.
- **📑 Business Reports & Exports**: Daily summaries, weekly performance rollups, and monthly downloadable PDF/CSV reports.
- **🔔 Smart Notification Center**: Categorized real-time notifications with priority flags (Critical, Warning, Info) and instant quick actions.
- **☀️🌙 Global Light & Dark Mode**: Persistent theme switching with custom CSS design tokens across all components.
- **📱 Fully Responsive Design**: Seamless layout scaling across mobile phones, tablets, and desktop displays.

---

## 🛠️ Tech Stack

### **Frontend**
- **Core Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State Management**: React Context API (`AuthContext`, `ThemeContext`)
- **UI & Styling**: Vanilla CSS with Design System Tokens, Glass-morphism, and Inter typography
- **Data Visualization**: Recharts
- **Icons**: Lucide React

### **Backend (Architecture Plan)**
- **API Server**: Node.js + Express.js
- **Database**: PostgreSQL (Prisma ORM / Supabase)
- **AI Analytics Service**: Python (FastAPI / Pandas / Scikit-Learn)
- **Authentication**: JWT & Role-Based Access Control (Admin, Manager)

---

## 📂 Project Structure

```
DecisionOS/
├── frontend/
│   ├── public/                 # Static assets (favicons, icons)
│   ├── src/
│   │   ├── assets/             # Brand logos and images
│   │   ├── components/         # Reusable UI components & layouts
│   │   │   ├── common/         # Buttons, inputs, modals
│   │   │   └── layout/         # AppLayout, Sidebar, Topbar, ProtectedRoute
│   │   ├── context/            # Global context (AuthContext, ThemeContext)
│   │   ├── pages/              # Main application views
│   │   │   ├── Auth/           # Login & Register views
│   │   │   ├── AIInsights.jsx  # Predictive AI Insights page
│   │   │   ├── Dashboard.jsx   # Executive BI Dashboard
│   │   │   ├── DataImport.jsx  # Excel/CSV import tool
│   │   │   ├── Landing.jsx     # Marketing landing page
│   │   │   ├── Notifications.jsx # Notification management center
│   │   │   └── Reports.jsx     # Business reporting & export view
│   │   ├── App.jsx             # Router configuration & providers
│   │   ├── main.jsx            # React application entry point
│   │   └── index.css           # Global design tokens & CSS resets
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0 or higher)

### **Installation**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/DecisionOS.git
   cd DecisionOS
   ```

2. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to `http://localhost:5174/` (or the URL displayed in your terminal).

---

## 🔑 Demo Access Credentials

To test the application in mock authentication mode:

- **Email**: `admin@acmecorp.com`
- **Password**: `any password`

---

## 🎨 Design System & Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--bg-canvas` | `#F8FAFC` | `#0F172A` | Primary page background |
| `--bg-sidebar` | `#FFFFFF` | `#1E293B` | Navigation sidebar & cards |
| `--accent-primary` | `#1D4ED8` | `#1D4ED8` | Primary CTA, links, active states |
| `--accent-success` | `#10B981` | `#10B981` | Positive trends, stock indicators |
| `--accent-warning` | `#F59E0B` | `#F59E0B` | Churn risk, medium alerts |
| `--accent-error` | `#EF4444` | `#EF4444` | Stockout alerts, drops |

---

## 📄 License

This project is licensed under the MIT License — see the `LICENSE` file for details.
