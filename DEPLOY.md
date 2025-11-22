# Deployment Guide: Render & Supabase

This guide explains how to deploy the Anilist-Trakt Sync application using **Render** (hosting) and **Supabase** (database).

## 1. Supabase Setup (Database)

1.  **Create a Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **SQL Editor**: Go to the SQL Editor in your Supabase dashboard.
3.  **Run Schema**: Copy the contents of `supabase_schema.sql` from this repository and run it in the SQL Editor. This creates the necessary `kv_store` table.
4.  **Get Credentials**:
    *   Go to **Project Settings** -> **API**.
    *   Copy the **Project URL** (`SUPABASE_URL`).
    *   Copy the **service_role** secret (`SUPABASE_SERVICE_ROLE_KEY`).
    *   > ⚠️ **IMPORTANT**: Do NOT use the `anon` key. The app needs the `service_role` key to bypass Row Level Security for backend operations.

## 2. Render Setup (Hosting)

1.  **Create Account**: Go to [Render](https://render.com/) and sign up.
2.  **New Web Service**: Click "New +" and select "Web Service".
3.  **Connect GitHub**: Connect your GitHub account and select this repository.
4.  **Configure**:
    *   **Name**: `anilist-trakt-sync`
    *   **Region**: Choose one close to you.
    *   **Branch**: `main`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
    *   **Plan**: Free
5.  **Environment Variables**:
    Add the following environment variables (copy values from your local `.env` or Supabase):
    *   `SUPABASE_URL`: (From Supabase)
    *   `SUPABASE_SERVICE_ROLE_KEY`: (From Supabase)
    *   `TRAKT_CLIENT_ID`: (From Trakt)
    *   `TRAKT_CLIENT_SECRET`: (From Trakt)
    *   `TRAKT_ACCESS_TOKEN`: (From Trakt)
    *   `TRAKT_REFRESH_TOKEN`: (From Trakt)
6.  **Deploy**: Click "Create Web Service".

## 3. Verification

Once deployed, Render will give you a URL (e.g., `https://anilist-trakt-sync.onrender.com`).

1.  Visit `/api/mappings` to check if the database connection works (it should return an empty list initially).
2.  Visit `/api/logs` to check the logging system.
3.  Trigger a sync via `/api/sync?anilistId=...` or `/api/full-sync`.

## Why this stack?

*   **Render**: Unlike Vercel, Render's free tier allows for longer-running processes (up to minutes), which is crucial for the full sync operation.
*   **Supabase**: Provides a persistent PostgreSQL database. Unlike Redis (Vercel KV), your data (mappings, logs) is stored permanently on disk and won't vanish unexpectedly.
