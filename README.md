# PolyU Calendar Subscription Service 📅

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tsunheimat/polyu-calendar-subscription)

A serverless application that transforms your static PolyU eStudent `.ics` timetable export into a **live, subscribable calendar feed**. Hosted entirely on Cloudflare's free tier.

## 🚀 Features

*   **One-Click Import**: Drag & drop your `.ics` file from eStudent.
*   **Live Subscription**: Get a permanent `https://` or `webcal://` link.
*   **Universal Compatibility**: Works with Google Calendar, Apple Calendar, Outlook, and more.
*   **Privacy Focused**: Your data is stored securely in your personal Cloudflare D1 database instance.
*   **Serverless**: Powered by Cloudflare Workers (Backend) and Pages (Frontend).

## 🏗 Architecture

*   **Frontend**: Static HTML/CSS/JS (Cloudflare Pages)
*   **Backend**: TypeScript (Cloudflare Workers)
*   **Database**: SQLite (Cloudflare D1)

## 🛠 Quick Start (Local Development)

### Prerequisites

*   Node.js (v18+)
*   Cloudflare Wrangler CLI (`npm install -g wrangler`)
*   A Cloudflare account

### 1. Installation

```bash
# Install dependencies in root and backend
npm install
cd backend && npm install && cd ..
```

### 2. Database Setup

Create a local D1 database for development:

```bash
# Setup database (creates polyu-calendar-db)
npm run setup:db

# IMPORTANT: Copy the 'database_id' from the output above!
# Paste it into backend/wrangler.toml for the 'database_id' field.
```

Apply the schema:

```bash
# Migrate local database
npm run db:migrate:local
```

### 3. Run Locally

```bash
# Start Backend (Port 8787)
npm run dev:backend

# Start Frontend (in a new terminal)
npx serve frontend
```

Open your browser to the local frontend URL (usually `http://localhost:3000`) and the app should connect to your local backend at `http://127.0.0.1:8787`.

## ☁️ Deployment Guide

### Using the Deploy Button

1.  Push this code to a GitHub repository.
2.  Click the **Deploy to Cloudflare Workers** button at the top of this README.
3.  Follow the instructions to connect your account.
    *   **Note**: You will need to manually create the D1 database binding in the Cloudflare Dashboard if the automatic setup doesn't configure it for you.

### Manual Deployment (CLI)

1.  **Deploy Backend**:
    
    Ensure you have updated `backend/wrangler.toml` with your real ID from `npx wrangler d1 create polyu-calendar-db`.

    ```bash
    # Apply schema to remote production DB
    npm run db:migrate:remote
    
    # Deploy Worker
    npm run deploy:backend
    ```

2.  **Deploy Frontend**:

    ```bash
    npm run deploy:frontend
    ```

3.  **Link Them**:
    
    After deployment, your frontend needs to know where the backend is.
    *   **Option A**: Update `frontend/app.js` with your production Worker URL (e.g., `https://polyu-calendar-subscription-backend.your-subdomain.workers.dev`).
    *   **Option B (Recommended)**: Configure Cloudflare Pages "Functions" or "Routes" to proxy `/api` requests to your Worker, or simply keep them on separate subdomains and handle CORS (already configured in `wrangler.toml`).

## 🧪 Testing

Run property-based tests to ensure ICS parsing correctness:

```bash
cd backend
npm test
```

## 📄 License

MIT
