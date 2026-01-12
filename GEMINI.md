# AI Agent Context: MOAPYR

This document outlines the architectural context, technical decisions, and current state of the MOAPYR Resource Station. AI agents should read this first to understand the system.

## Project Overview

**Name**: MOAPYR Resource Station
**Goal**: A serverless modding community platform for uploading, searching, and downloading game resources.
**Architecture**: Serverless Monorepo (Frontend on Cloudflare Pages, Backend on Cloudflare Workers).

## Tech Stack & Infrastructure

### Backend (Cloudflare Workers)
*   **Framework**: Hono (`backend/src/index.ts`).
*   **Database**: Cloudflare D1 (SQLite). Database binding: `DB`.
*   **Object Storage**: Cloudflare R2 (S3-compatible). Bucket binding: `BUCKET`.
*   **AWS SDK**: Used `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to generate upload/download links (native R2 bindings don't support presigning).
*   **Auth**: Simple shared secret (`AUTH_SECRET`) for Admin routes.
*   **Local Development Simulation**:
    *   To support offline development without AWS credentials, `backend/src/routes/resources.ts` includes logic to detect `env.R2_ACCOUNT_ID === 'local_dev'`.
    *   In this mode, it bypasses AWS SDK presigning and instead generates URLs pointing to a local proxy route (`/api/resources/local-bucket/:key`).
    *   This proxy route uses the native `c.env.BUCKET` binding to read/write files to the local Wrangler simulation.

### Frontend (Cloudflare Pages)
*   **Framework**: React (Vite).
*   **Styling**: Tailwind CSS.
*   **Routing**: React Router (implied by `App.tsx` structure).
*   **Deployment**: Static export to `frontend/dist`.
*   **Config**: `VITE_API_URL` environment variable required at build time.

## Data Model (D1)

### Table: `resources`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (UUID) | Primary Key. |
| `title` | TEXT | Resource title. |
| `description` | TEXT | Resource details. |
| `tags` | TEXT | Comma-separated tags. |
| `uploader_ip` | TEXT | IP address of uploader (for audit). |
| `file_key` | TEXT | R2 Object Key (`{uuid}-{filename}`). |
| `file_name` | TEXT | Original filename. |
| `file_size` | INTEGER | Size in bytes. |
| `status` | TEXT | Lifecycle state (see Status Flow below). |
| `downloads` | INTEGER | Download counter. |
| `created_at` | INTEGER | Timestamp (Unix epoch). |
| `updated_at` | INTEGER | Timestamp (Unix epoch). |

### Table: `analytics`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Auto-increment PK. |
| `resource_id` | TEXT | FK to resources. |
| `event_type` | TEXT | 'download', 'view'. |
| `timestamp` | INTEGER | Timestamp. |

### Status Lifecycle
1.  **`pending_upload`**: Record created via `POST /init-upload`. File not yet confirmed.
2.  **`pending`**: User confirmed upload via `POST /finalize-upload`. Waiting for Admin review.
3.  **`approved`**: Visible in search results (`GET /`).
4.  **`rejected`**: Hidden from search.

## API Interface

### Base URL: `https://<worker-subdomain>.workers.dev/api`

#### Public Routes
*   `GET /resources`: List approved resources. Supports `?q=` (search) and `?tag=`.
*   `GET /resources/:id`: Get resource metadata.
*   `GET /resources/:id/download`: Get 1-hour presigned R2 GET URL. Increments download count.
*   `POST /resources/init-upload`:
    *   **Input**: `{ title, description, tags, fileName, fileSize }`
    *   **Output**: `{ id, uploadUrl, fileKey }`
    *   **Logic**: Generates S3 Presigned PUT URL.
*   `POST /resources/finalize-upload`:
    *   **Input**: `{ id }`
    *   **Logic**: Marks status as `pending`.
*   `ALL /resources/local-bucket/:key` (Local Dev Only):
    *   **Logic**: Proxies PUT/GET requests to the local R2 bucket simulation when `R2_ACCOUNT_ID="local_dev"`.

#### Admin Routes (Requires `x-admin-token` header)
*   `GET /admin/pending`: List resources with `status = 'pending'`.
*   `POST /admin/approve/:id`: Set status to `approved`.
*   `POST /admin/reject/:id`: Set status to `rejected`.

## Configuration & Secrets

### Backend (`wrangler.toml` & `wrangler secret`)
*   `DB`: D1 Database ID (Must be manually set in `wrangler.toml`).
*   `BUCKET_NAME`: `moapyr-files` (Hardcoded in `resources.ts`, be careful if changing).
*   `R2_ACCOUNT_ID`: R2 Account ID (Secret).
*   `R2_ACCESS_KEY_ID`: R2 Access Key (Secret).
*   `R2_SECRET_ACCESS_KEY`: R2 Secret Key (Secret).
*   `AUTH_SECRET`: Admin password (Secret).

### Frontend (Pages Settings)
*   `VITE_API_URL`: Backend URL (e.g., `https://backend.moapyr.workers.dev/api`).

## Known Issues & Limitations
1.  **Hardcoded Bucket Name**: `backend/src/routes/resources.ts` uses literal string `'moapyr-files'`. If the R2 bucket is named differently, uploads will fail.
2.  **Security**: Admin authentication is a single shared string stored in `localStorage` on the frontend. Not suitable for multi-user admin scenarios.
3.  **Validation**: No schema validation (Zod/Valibot) for input requests.
4.  **Error Handling**: Basic `try/catch`. Missing global error boundary.
5.  **CORS**: Configured as wildcard `*`.
6.  **Environment Sync**: `wrangler.toml` often contains placeholder `database_id` values that users forget to update.

## Agent Instructions

*   **Build**: To build frontend, `cd frontend && npm run build`.

*   **Deploy Backend**: `cd backend && npm run deploy`.

*   **Deploy Frontend**: Push to git or `wrangler pages deploy frontend/dist`.

*   **Local Simulation Mode (Offline Dev)**:

    1.  **Backend**: `cd backend && npm run dev`.

        *   This uses `backend/.dev.vars` (ensure `R2_ACCOUNT_ID="local_dev"` is set).

        *   Runs on `http://localhost:8787`.

    2.  **Frontend**: `cd frontend && npm run dev`.

        *   Uses `frontend/.env.development` (`VITE_API_URL=http://localhost:8787/api`).

    3.  **Note**: In this mode, file uploads are stored in the local `.wrangler` state directory, not cloud R2.

*   **Code Modifying**:

    *   If changing `schema.sql`, remind user to run `wrangler d1 execute`.

    *   If adding environment variables, remind user to add them to Pages or Worker Secrets.
