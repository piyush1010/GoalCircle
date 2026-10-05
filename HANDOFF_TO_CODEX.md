# GoalCircle — verified project handoff

## Product purpose

GoalCircle is a mobile-first social accountability platform. A user declares a public goal or shares one with a private circle, submits daily visual proof and focus logs, receives peer encouragement, builds a visible streak and consistency record, and can turn the accumulated work into a shareable memory reel.

The primary product pillars are public goals, private circles, goal subscriptions, positive social feedback, daily proof, consistency matrices, leaderboards, and transformation recaps. Intended uses include learning, exam preparation, fitness, personal growth, and community or NGO projects.

## Verified application stack

- Next.js `16.3.6` using the App Router
- React and React DOM `19.2.8`
- TypeScript `^5`
- Tailwind CSS `^4` through `@tailwindcss/postcss`
- Supabase JS `^2.117.2`, Supabase SSR `^0.12.7`, and legacy auth helpers `^0.15.0`
- Capacitor `8.5.x` for Android and iOS wrappers
- npm with `package-lock.json`

These versions come from `package.json` in the supplied archive. They supersede the earlier handoff text that described Next.js 14 and Tailwind CSS 3.

## Routing-tree decision

The active application is the root `app/` tree. The supplied archive also contained a four-file `src/app/` starter template, but Next.js 16 documents that `src/app` is ignored whenever a root `app` directory exists. The root tree contained the newer product implementation and every functional route, while `src/app` contained only the unmodified starter home page, layout, CSS, and favicon. The unused `src/` directory was removed during this audit.

## Routes and major capabilities

- `/`: authenticated goal/feed surface with quick goal and progress logging
- `/login`: email/password and Google OAuth authentication
- `/signup`: redirect to the signup mode of `/login`
- `/auth/callback`: Supabase OAuth code exchange
- `/dashboard`: goal dashboard
- `/goal` and `/goal/[id]`: goal list and goal detail
- `/create-goal`: goal creation flow
- `/create`: central creation chooser
- `/check-in`: database-backed daily progress check-in
- `/feed`: social progress feed
- `/profile` and `/u/[username]`: current-user and public profiles
- `/focus`: focus-session experience
- `/circles`: social and private-circle surface
- `/leaderboard`: ranking experience
- `/notifications`, `/search`, `/referrals`, and `/settings`: supporting product flows
- `/api/challenges/[id]`: authenticated challenge update endpoint

Shared UI lives in `components/`; domain helpers and integrations live in `lib/` and `utils/`.

## Visual direction

The approved theme references live in `docs/design-reference/`:

- `feed-light-dark.png`
- `dashboard-light-dark.png`
- `profile-light-dark.png`

They establish paired light and dark themes with warm amber as the primary action and progress color; cool white or deep navy page surfaces; restrained gray-blue borders; compact rounded cards; strong numeric hierarchy; and a persistent five-item mobile navigation with a raised amber create button. The images are concept mockups rather than pixel-perfect flat exports, so copy artifacts and device perspective should not be reproduced literally.

## Supabase integration

The code references these tables: `blocks`, `challenge_invites`, `circle_members`, `focus_logs`, `goals`, `posts`, `post_comments`, `post_reactions`, `profiles`, `reports`, `follows`, and `user_relationships`. Authentication uses email/password, Google OAuth, session reads, password reset, profile updates, and sign-out. Apply `supabase/migrations/202610050001_social_foundation.sql` before previewing the new feed.

Required client environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Configure real values in `.env.local` for local development and in the Vercel project settings for deployments. Do not commit real credentials.

## Local setup and checks

```bash
npm ci
npm run dev
npx tsc --noEmit
npm run lint
npm run build
```

Capacitor currently points `webDir` at `out`. The Next.js project is configured for a server build rather than static export because it includes API routes, OAuth callbacks, and cookie-based authentication. Native packaging therefore needs a separate, deliberate web-output strategy before the Android or iOS wrappers can be refreshed.

## Artifact cleanup

The archive contained `out/` and Android Gradle build intermediates. They were excluded from the working copy. `.gitignore` covers `/out/`, `/android/.gradle/`, `/android/build/`, and `/android/**/build/`.

## Deployment information

- Reported production URL: `https://goalcircle-ivory.vercel.app`
- Verified login URL: `https://goalcircle-ivory.vercel.app/login`
- Expected Vercel framework preset: Next.js
- Expected project root: repository root
- Expected build command: `npm run build`

The ZIP did not include `.git` metadata or `.vercel` linkage, so the previously claimed repository remote, branch, commit SHA, and Vercel project connection cannot be verified from this handoff.

## Remaining work

1. Apply and verify the social schema migration against a non-production Supabase branch/project.
2. Add Supabase Storage upload support for avatar and proof media.
3. Compare Feed, Dashboard, and Profile at 375 px, 768 px, and 1280 px or wider, then complete the responsive design.
4. Confirm OAuth redirect URLs against the live project.
4. Decide how the authenticated server-rendered Next.js app should be packaged for Capacitor; the existing `webDir: 'out'` does not match the current server-build configuration.
5. Push the feature branch and create a Vercel preview before merging to the existing production project.

## Audit record

- Source: user-supplied `goalcircle-codex-handoff.zip`
- Archive integrity: passed `unzip -t`
- Unsafe archive paths: none detected
- Secret-like filenames: none detected
- Dependency installation: `npm ci` completed; npm reported deprecation warnings for `uuid@7.0.3`, `@supabase/auth-helpers-nextjs@0.15.0`, and `eslint@9.39.5`
- Type-check: `npx tsc --noEmit` passed
- Lint: generated Capacitor web bundles were excluded from ESLint. The stabilization pass resolved all source errors; 9 image-optimization warnings remain in legacy screens/components
- Production build: the default Turbopack build could not run in the restricted host because its CSS worker was denied permission to bind an internal port; `next build --webpack` compiled, type-checked, and generated all 21 routes successfully when supplied non-secret placeholder Supabase values
- Stabilization: consolidated theme persistence on `next-themes`, removed effect-driven state initialization problems, corrected focus-timer callback ordering, added concrete API/data types, removed dead duplicate route files, and preserved the active root `app/` router
- Live baseline: the deployed login route was verified as reachable. Its current dark navy and amber treatment broadly matches the reference palette, but it does not yet demonstrate the paired light theme shown in the supplied designs
- Product foundation: replaced browser-only feed data with Supabase posts, boosts, comments, and follows; added daily check-ins; rebuilt the dashboard around live goals/focus logs; added the raised central create flow; hid app navigation on authentication routes; fixed the broken new-OAuth-user redirect; and added global loading, error, and not-found states
