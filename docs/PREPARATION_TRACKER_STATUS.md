# Preparation Tracker: Status

| Milestone | State | Notes |
|---|---|---|
| 0. Audit & architecture | Done (1 Nov 2026) | See `PREPARATION_TRACKER_SPEC.md`. Awaiting approval of the design and the open decisions below. |
| 1. Schema, RLS, templates | Not started | File plan in spec §8. |
| 2–10 | Not started | Per brief. |

## Open decisions (product owner)
1. UPSC syllabus depth for v1: official-notification level (stages → papers → subjects → topics, ~150 topics), or deeper subtopics now.
2. Default weights for the readiness indices (proposed in M4; v1 can weight topics equally).
3. Beta users for the feature flag (owner only, or named testers).
4. Navigation: where "Prep" lives in the 5-item bottom bar (e.g. replace Feed for beta users, or inside Today).
5. Add Vitest as a dev dependency for scoring tests.

## Environment notes
- Local npm registry is blocked in the build environment, so type-check, lint and build run on Vercel previews. Local Postgres 16 harness (built from `supabase/migrations`) is used to verify SQL and RLS.
- Migrations are applied manually in the Supabase SQL editor before merging the PR that needs them.

## Next step
On approval: Milestone 1 on branch `prep-tracker-m1`, behind the `prep` feature flag.
