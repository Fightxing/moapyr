# AI Agent Context: MOAPYR

This document is intended for AI Agents to quickly understand the project context, architectural decisions, and existing implementation details.

## Project Overview

**Name**: MOAPYR Resource Station
**Goal**: A serverless modding community platform for uploading, searching, and downloading game resources.
**Status**: Initial MVP complete (Core features implemented).

## Tech Stack & Decisions

*   **Platform**: Cloudflare Ecosystem (chosen for cost and performance).
*   **Backend**: Hono framework on Cloudflare Workers.
    *   **Why Hono?**: Lightweight, standard web standards support, runs natively on Workers.
    *   **Why S3 SDK?**: Native R2 bindings do not support generating Presigned URLs for client-side uploads. We use `@aws-sdk/client-s3` pointing to the R2 endpoint to achieve this.
*   **Database**: D1 (SQLite).
    *   **Schema**: Simple relational model (`resources`, `analytics`).
    *   **Status Management**: Resources have a `status` field (`pending_upload` -> `pending` -> `approved`/`rejected`).
*   **Storage**: R2.
    *   **Access Pattern**: Direct browser-to-bucket Uploads (PUT) and Downloads (GET) via Presigned URLs. This offloads bandwidth from the Worker.

## Current Implementation State

### Backend (`backend/`)
*   **`src/index.ts`**: Main entry point. Sets up CORS and mounts sub-routers.
*   **`src/routes/resources.ts`**:
    *   `POST /init-upload`: Creates DB record, returns R2 Presigned PUT URL.
    *   `POST /finalize-upload`: Confirms upload, updates status to `pending` (ready for review).
    *   `GET /`: Search resources (supports query `q` and `tag`).
    *   `GET /:id`: Get metadata.
    *   `GET /:id/download`: Increments stats, returns R2 Presigned GET URL.
*   **`src/routes/admin.ts`**:
    *   Protected by `x-admin-token` header (matched against `AUTH_SECRET` env var).
    *   `GET /pending`: List items waiting for review.
    *   `POST /approve/:id`: Sets status to `approved`.
    *   `POST /reject/:id`: Sets status to `rejected`.

### Frontend (`frontend/`)
*   **Routing**: Defined in `App.tsx`.
*   **`src/api.ts`**: Simple fetch wrapper. **Note**: Needs improvement to handle custom headers for Admin token globally if auth complexity increases.
*   **`src/pages/Upload.tsx`**: Implements the 3-step upload pattern (Init -> S3 Upload -> Finalize).
*   **`src/pages/Admin.tsx`**: Simple dashboard. Manages `admin_token` in `localStorage` (insecure for high stakes, fine for MVP/Personal use).

## TODOs / Known Limitations

1.  **Auth**: Admin auth is a shared string. Needs proper Session/JWT or Cloudflare Access integration.
2.  **Validation**: Backend needs stricter input validation (Zod/Valibot).
3.  **Error Handling**: Basic try/catch blocks exist; needs global error boundary/middleware.
4.  **Tests**: No unit or integration tests exist yet.
5.  **Environment**: `wrangler.toml` contains placeholder IDs (`your-database-id-here`) which MUST be updated by the user.

## Instructions for Future Agents

*   **When modifying Schema**: Always update `schema.sql` AND generate a new migration file if preserving data is required (though D1 migration flow is manual currently).
*   **When adding Routes**: Prefer creating a new file in `routes/` and mounting it in `index.ts` to keep `index.ts` clean.
*   **UI Changes**: Stick to Tailwind CSS utility classes. Avoid adding new CSS files unless necessary.
