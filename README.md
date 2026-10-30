# Classroom Survey

A classroom polling app built with React, TypeScript, Vite, and Supabase. Students use a QR link without an account; an explicitly authorized instructor manages surveys and views results.

## Run locally

1. Install Node.js 20.19+ or 22.12+ and run `npm install`.
2. Create `.env` from `.env.example`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and public publishable/anon key from Supabase. These values are public client configuration; never use a service-role or secret key in the frontend or repository.
3. Complete the database setup below, then run `npm run dev`. Run `npm run build` and `npm test` to verify the production build and unit tests.

## Supabase setup

1. Create or select a dedicated Supabase project. In the SQL Editor, run the complete contents of `supabase/migrations/20261030000000_initial.sql` once on a new database. It creates tables, permissions, and transactional functions.
2. Disable public signup and create an instructor user in Supabase Authentication. In the SQL Editor, enroll that user's UUID (from the Auth users page), replacing the placeholder:

```sql
insert into public.instructors(user_id) values ('INSTRUCTOR-USER-UUID');
```

Only explicitly enrolled users can administer data. Keep the SQL Editor and project administration credentials private. Provide test credentials to the instructor privately; never commit them.

3. Verify RLS using a separate anonymous client: active survey content is readable, but responses and answers are not; survey writes are rejected. Test unlisted authenticated users too. Run the entire survey workflow before using real data.

## Deploy to Cloudflare Pages

Connect the GitHub repository in Cloudflare Pages. Use build command `npm run build`, output directory `dist`, and set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables. `public/_redirects` supports direct links to React routes. Redeploy when environment variables change. Test the public login, QR URL on a phone, anonymous submission, duplicate protection, results and CSV. Do not assume deployment or security verification is complete until tested.

## How it works

The React browser app uses the public Supabase client key. Auth signs in instructors; PostgreSQL row-level security and an instructor allowlist control access. The database saves drafts and activates surveys in transactions. Students can read active questions only and call a submission function, which validates the active survey and choices before saving a response atomically. A random browser token in local storage reduces accidental duplicates, but cannot prevent a determined user from using another browser or clearing storage. Results are instructor-only and exported in the browser.

- `src/main.tsx`: pages, routes, and interactions.
- `src/lib.ts`: Supabase client, models, ordering, and CSV.
- `supabase/migrations/`: database schema and permissions.
- `reviewer-experiment/`: review fixtures and scoring protocol.

## Current status

Implementation is in progress. See `TODO.md` and `docs/LEARNING_LOG.md` for verified progress and outstanding deployment work. Do not use real student responses until database access controls have been tested in the deployed project.
