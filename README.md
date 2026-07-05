# Money Flow

**Money Flow** is a personal finance management web app (PWA) that lets you record, categorize, analyze, and export your income and expenses. It runs as a Progressive Web App, so it can be installed on both mobile and desktop and used offline.

Key features:

- 🔐 **Auth** — register/login with JWT-based sessions
- 📊 **Dashboard** — balance summary, monthly income vs. expense charts, category breakdown, recent transactions
- 💸 **Transactions** — add / edit / delete (incl. bulk), filter, sort, paginate, and export to CSV / Excel
- 🏷️ **Categories** — 9 default categories + custom categories with color, icon, and type
- 📈 **Analytics** — period summaries, month-over-month comparison, trend & bar charts, top spending categories
- 🧾 **Receipt import (OCR)** — scan receipts via camera/upload, extract amount/date/merchant client-side with Tesseract.js
- 🎨 **UI** — light/dark/system theme, IDR/USD currency switch, responsive layout, mobile bottom nav
- 📱 **PWA** — installable, offline page, service worker caching, app shortcuts

See [`docs/PRD-v1.md`](docs/PRD-v1.md) (released) and [`docs/PRD-v2.md`](docs/PRD-v2.md) (planning) for full product requirements.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand |
| Charts | Recharts |
| OCR | Tesseract.js (client-side) |
| Export | XLSX |
| Backend | NestJS 11, TypeORM |
| Database | PostgreSQL |
| Auth | JWT (bcrypt + `@nestjs/jwt`) |

## Monorepo Structure

```
money-flow/
├── apps/
│   ├── web/    ← Next.js frontend
│   └── api/    ← NestJS backend
├── docs/       ← Product Requirements Documents
└── package.json  ← npm workspaces root
```

## Prerequisites

- **Node.js** 20+ (web) / 18+ (api) — Node 20+ recommended for both
- **npm** 9+ (workspaces)
- **PostgreSQL** 13+ running locally or reachable via network

## Getting Started

### 1. Clone & install

```bash
git clone <repo-url>
cd money-flow

# Install dependencies for both apps
npm run dev:install
# (or simply: npm install)
```

### 2. Set up the database

Create a PostgreSQL database (default name `money_flow`):

```sql
CREATE DATABASE money_flow;
```

> The API uses TypeORM with `synchronize: true` in non-production environments,
> so tables are created automatically on first run. Do **not** rely on this in production.

### 3. Configure environment variables

**`apps/api/.env`**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=money_flow

# Auth
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Run the apps

From the repository root, in two terminals:

```bash
# Terminal 1 — backend (http://localhost:3001)
npm run dev:api

# Terminal 2 — frontend (http://localhost:3000)
npm run dev:web
```

Open <http://localhost:3000> and register a new account to get started.

## Available Scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev:install` | Install dependencies for both `api` and `web` |
| `npm run dev:web` | Start the Next.js dev server |
| `npm run dev:api` | Start the NestJS dev server (watch mode) |
| `npm run build:web` | Build the frontend for production |
| `npm run build:api` | Build the backend for production |
| `npm run lint` | Lint all workspaces |

## API Endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |
| GET | `/api/transactions` | List transactions (supports filter queries) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| DELETE | `/api/transactions/bulk` | Bulk delete transactions |

## Production Build

```bash
npm run build:api && npm run build:web

# Start backend
npm run start:prod --workspace=apps/api

# Start frontend
npm run start --workspace=apps/web
```

Set `NODE_ENV=production` on the API and provide a strong `JWT_SECRET`. With `NODE_ENV=production`, TypeORM `synchronize` is disabled — manage schema via migrations.
