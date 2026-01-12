# MOAPYR Resource Station

MOAPYR is a community-driven resource station designed for sharing game mods. It is a fully serverless application built on the Cloudflare ecosystem, focusing on performance, scalability, and cost-efficiency.

## 🏗 Architecture

The project is a Monorepo containing a Frontend and a Backend.

*   **Frontend (`/frontend`)**:
    *   **Tech Stack**: React 18, Vite, TypeScript, Tailwind CSS.
    *   **Routing**: `react-router-dom` handles client-side routing.
    *   **Features**:
        *   **Home**: Searchable list of approved resources.
        *   **Upload**: Multi-step upload process (Metadata -> Presigned URL -> R2 Direct Upload -> Finalize).
        *   **Detail**: Resource description and download handling.
        *   **Admin**: Dashboard for reviewing pending uploads (approve/reject).
*   **Backend (`/backend`)**:
    *   **Tech Stack**: Cloudflare Workers, Hono, TypeScript.
    *   **Data Storage**: Cloudflare D1 (SQLite) for metadata (titles, descriptions, stats).
    *   **File Storage**: Cloudflare R2 for binary files (mods).
    *   **Key Logic**:
        *   Generates AWS S3 Presigned URLs for secure, direct client-to-bucket uploads (bypassing Worker execution time limits for large files).
        *   Admin authentication via simple header token.

## 🚀 Setup & Deployment

### Prerequisites
*   Node.js (v18+) and npm.
*   Cloudflare Account.
*   Wrangler CLI installed globally or used via `npx`.

### 1. Backend Configuration

1.  **Navigate to backend**: `cd backend`
2.  **Create D1 Database**:
    ```bash
    npx wrangler d1 create moapyr-db
    ```
    *Copy the `database_id` from the output and paste it into `wrangler.toml`.*
3.  **Create R2 Bucket**:
    ```bash
    npx wrangler r2 bucket create moapyr-files
    ```
4.  **Initialize Database Schema**:
    ```bash
    npx wrangler d1 execute moapyr-db --file=./schema.sql --remote
    ```
5.  **Set Secrets** (Crucial for Presigned URLs):
    Obtain R2 API Tokens (S3 API) from Cloudflare Dashboard.
    ```bash
    npx wrangler secret put R2_ACCOUNT_ID
    npx wrangler secret put R2_ACCESS_KEY_ID
    npx wrangler secret put R2_SECRET_ACCESS_KEY
    npx wrangler secret put AUTH_SECRET  # Your chosen admin password
    ```
6.  **Deploy**:
    ```bash
    npm run deploy
    ```
    *Note the deployed Worker URL (e.g., `https://moapyr-backend.your-subdomain.workers.dev`).*

### 2. Frontend Configuration

1.  **Navigate to frontend**: `cd frontend`
2.  **Configure Environment**:
    Create a `.env` file (or set in CI/CD):
    ```env
    VITE_API_URL=https://moapyr-backend.your-subdomain.workers.dev/api
    ```
3.  **Run Locally**:
    ```bash
    npm run dev
    ```
4.  **Deploy**:
    Build the project:
    ```bash
    npm run build
    ```
    Deploy the `dist/` folder to Cloudflare Pages.

## 🛡 Security Notes

*   **Uploads**: Uses Presigned URLs to ensure only authenticated/valid requests can write to the bucket.
*   **Admin**: Currently uses a simple shared secret (`x-admin-token` header). For production, consider integrating Cloudflare Access or a more robust auth provider.
*   **Downloads**: Generated via Presigned GET URLs to control access and track download stats accurately.

## 📂 Project Structure

```
/
├── backend/            # Cloudflare Worker code
│   ├── src/
│   │   ├── routes/     # API Route handlers (resources, admin)
│   │   ├── index.ts    # Entry point & Hono app setup
│   │   └── types.ts    # Shared TypeScript types
│   ├── schema.sql      # Database schema
│   └── wrangler.toml   # Worker configuration
└── frontend/           # React application
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── pages/      # Route pages (Home, Upload, Admin)
    │   └── api.ts      # API helper utility
    └── tailwind.config.js
```
