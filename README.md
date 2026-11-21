# BizLens

Simple records and clear numbers for small businesses in Zambia.
Milestone 1: sign in, set up a business, add products, receive stock,
record sales and expenses, and see a dashboard built from a double-entry ledger.

## Stack
Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · Vercel · GitHub Actions

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and paste your Supabase URL and publishable key.
3. In Supabase > SQL Editor, run `supabase/migrations/001_bizlens_core.sql` once.
4. `npm run dev` and open http://localhost:3000

## Checks
- `npm test` – unit tests for the calculation rules
- `npm run lint` and `npm run typecheck`
- `supabase/tests/001_accounting_checks.sql` – paste into the Supabase SQL Editor; prints ALL CHECKS PASSED

## Accounting rules (milestone 1)
- Perpetual inventory, weighted-average cost, negative stock blocked.
- Every sale, receipt and expense posts a balanced journal; the dashboard reads the ledger.
- All writes go through database functions; tables are read-only to the app (Row Level Security).
