# GoalCircle

GoalCircle is a social accountability platform for announcing goals, posting daily proof, tracking focus and streaks, joining private circles, and turning sustained progress into shareable memory reels.

## Stack

- Next.js 16.3.6 with the App Router
- React 19.2.8 and TypeScript
- Tailwind CSS 4
- Supabase authentication and PostgreSQL data
- Capacitor 8 for Android and iOS wrappers

## Local setup

1. Copy `.env.example` to `.env.local` and provide the Supabase project values.
2. Install dependencies with `npm ci`.
3. Apply the SQL migrations under `supabase/migrations/` to the matching Supabase project.
4. Start the site with `npm run dev`.
5. Open `http://localhost:3000`.

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The active Next.js routing tree is the root `app/` directory. See `HANDOFF_TO_CODEX.md` for the audit record, architecture overview, and remaining work.

The social migration adds goal visibility, database-backed check-ins, boosts, comments, follows, indexes, and row-level security. Preview and production databases must be migrated before deploying the new feed.
