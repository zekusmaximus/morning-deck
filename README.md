# Morning Deck (Supabase)

Morning Deck is a Vite SPA that talks directly to Supabase Postgres with RLS enforcement.

## Prerequisites

- Node.js + pnpm
- A Supabase project (local or hosted)

## Environment variables

Create a `.env` file based on `.env.example`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Vite only exposes environment variables prefixed with `VITE_`.

## Supabase schema + migrations

1. Apply the SQL in `supabase/migrations/0001_init.sql` to your Supabase project.
2. (Optional) Seed demo data using `supabase/seed.sql` (replace the `user_id` placeholder with a real `auth.users` id first).

## Local development

```bash
pnpm install
pnpm dev
```

The app runs as a client-only SPA and relies on Supabase for data and auth.

## Build

```bash
pnpm build
pnpm preview
```
