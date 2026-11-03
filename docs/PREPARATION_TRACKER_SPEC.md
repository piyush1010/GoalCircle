# GoalYaar Preparation Tracker: Architecture (Milestone 0)

Status: proposal, awaiting product-owner approval. Source brief: product owner's tracker prompt (1 Nov 2026).

## 1. Current system (audited 1 Nov 2026)

| Area | Finding |
|---|---|
| Framework | Next.js 16.3.6 (App Router, `app/`), React 19.2.8, React Compiler, TypeScript 5, Tailwind v4 (`@theme` tokens in `app/globals.css`). |
| Pages | All screens are client components; data is loaded in the browser with the Supabase JS client. Only `app/api/push` and `app/api/challenges/[id]` run on the server. |
| Auth | Supabase Auth (Google + email/password). Browser client in `utils/supabase.ts` (`@supabase/supabase-js` 2.117); server client via `@supabase/ssr` in API routes. No `middleware.ts`/`proxy.ts`: each page checks `getSession()` and redirects to `/login`. |
| Data | 27 tables via 40+ SQL files in `supabase/migrations/` (run manually in the Supabase SQL editor). RLS everywhere; security-definer RPCs for cross-user reads (`circle_dashboard`, `circle_today_progress`, `admin_insights`). |
| Relevant models | `goals` + `posts` (check-ins, streaks), `focus_logs` (minutes), `circles`/`circle_memberships`/`circle_tasks`/`circle_task_checkins` (mentor batches), `notifications` (+ pg_net push trigger, pg_cron daily reminders), `user_preferences` (reminder time, time zone, quiet hours), `lib/exams.ts` (exam ids incl. upsc, cat, state_psc). |
| Storage | `goal-media` (public), `circle-files` and `batch-proof` (private, signed URLs). |
| Design | Navy `slate` + saffron `amber` tokens, light default + dark, 17px base, `rounded-2xl` cards, lucide icons, fixed 5-item `BottomNav`, Goalie mascot. |
| Tests | None in repo (no Vitest/Jest/Playwright config). SQL is verified ad hoc against a local Postgres 16 built from the migrations. |
| Deploy | Vercel (region `bom1`), preview per PR, production on merge to `main`. Capacitor config still says `GoalCircle` (native builds not in use). |
| Constraint | This build environment cannot reach the npm registry, so local type-check/lint/build are unavailable; Vercel's build is the compile gate until that changes. |

## 2. Principles applied

Activities are recorded; indicators are calculated. Coverage (did I touch it) is separate from readiness (would it hold up today). Missing evidence shows "Not enough evidence". Indices are bands, never "100%". Scoring is deterministic, versioned and explainable; AI only suggests and always needs confirmation. Everything is private by default; mentors see only what the student shares.

## 2a. Adoption guardrails (every milestone must pass these)

| Risk | Rule |
|---|---|
| **Excessive data entry** | Daily logging ≤ 2 minutes; a single log ≤ 10 seconds (≤ 3 taps: action, topic, optional count). Topic picker opens on recent and due topics, not the full tree. Defaults everywhere (today, last topic, quantity 1). Optional detail (traps, option notes, timing) is never required. Existing GoalYaar check-ins and focus minutes count as evidence, so nothing is entered twice. |
| **Initial setup burden** | Setup is one screen: exam, exam date, daily time (optional subject optional). The official syllabus is preloaded; no topic configuration is ever required. Value on day one: the first log immediately shows a topic on the map and a revision date. Sources, NCERT path, mentor sharing and plans are introduced later, one at a time. |
| **False precision** | Whole numbers only; indices are shown as a band first ("Developing"), number second. Every figure has a one-tap "Why?". Below the evidence threshold: "Not enough evidence", never 0 or a guess. No "% prepared" anywhere; nothing above 95. |
| **Feature overload** | Today shows at most three prep items: the plan (top 3 tasks), revision due (top 3), and one snapshot line. Everything else lives one level down. One revision digest per day by default. A feature appears only after the student has data for it (e.g. CSAT safety after the first CSAT mock). Advanced logs (traps, option notebook, deep audits) are opt-in. |

These are checked in each milestone's verification (tap counts and the Today item limit are part of the acceptance criteria).

## 3. Data model (new tables, prefix `prep_`)

**Exam templates (shared, read-only to users)**
- `prep_exam_templates` (id, code e.g. `upsc_cse`, name, version, `base_template_id` for overlays such as a State PCS on top of a civil-services base, status draft|live).
- `prep_syllabus_nodes` (id, template_id, parent_id, kind stage|paper|subject|topic|subtopic|ncert_book|ncert_chapter, code, title, stages text[] e.g. {prelims,mains}, papers text[], weight, sort, `pyq_frequency`, `owner_id` null = official / user id = custom subtopic, `source` official|mentor|user).

**Student profile**
- `prep_profiles` (user_id pk, template_id, exam_date, optional_subject_node_id, daily_minutes, preferred_hours, reminder_mode minimal|balanced|active, feature_enabled).

**Evidence ledger (append-only, the source of truth)**
- `prep_events` (id, user_id, node_id null, kind studied|revised|pyq|answers|mock|notes|current_affairs|ncert_step|source_change, quantity, details jsonb (validated per kind), occurred_on, minutes, `source` manual|timer|screenshot|mentor|import, `confirmed` bool, `extraction_method`, `algorithm_version`, created_at, `supersedes_id` for edits). Edits create a new row; history is kept.

**Typed logs (structured, queryable)**
- `prep_mock_tests` (user_id, exam/stage, name, taken_on, score, max_score, correct, incorrect, unattempted, accuracy, percentile, rank, minutes, platform, attempt_strategy, quick_audit flags, guess counters, provenance fields). CHECKs enforce correct+incorrect+unattempted = total, score ≤ max, 0–100 ranges, date ≤ today.
- `prep_pyq_attempts` (user_id, exam, year, paper, node_id, attempted, correct, revised, options_analysed, notebook jsonb optional).
- `prep_mistakes` (user_id, mock_id|pyq_id, node_id, trap category enum of the 10 brief categories).
- `prep_answer_logs` (user_id, paper, node_id, count, timed, mentor_reviewed, written_on) aggregated by view.
- `prep_sources` (user_id, subject_node_id, title, role primary|ncert|current_affairs|pyq|test_series|supplementary, status active|archived, replaced_by).
- `prep_current_affairs` (user_id, title, kind judgment|report|committee|scheme|budget|survey|state_example, occurred_on, note) + `prep_current_affairs_links` (item_id, node_id, stage).

**Derived state (cache, recomputable from the ledger)**
- `prep_topic_state` (user_id, node_id, touched_at, foundation flags {read, highlighted, notes, open_notes, limited_sources}, revision_count, last_revised_on, interval_days, next_revision_on, stage, algorithm_version). Maintained by a trigger on `prep_events` so reminders work server-side.
- `prep_score_snapshots` (user_id, computed_on, algorithm_version, metrics jsonb, explanations jsonb): weekly trend history.

**Planning and sharing**
- `prep_plan_items` (user_id, plan_date, node_id, action, minutes, reason, status draft|accepted|done|deferred|removed, generator_version, bucket must|should|can_defer).
- `prep_mentor_shares` (student_id, circle_id, scope full|summary|tasks_only|subjects|nothing, subject_node_ids uuid[]), default `nothing`.

Later milestones only: revision vault (`prep_vault_entries`), State PCS overlay nodes, CAT template.

## 4. RLS model
- Templates and official nodes: `select` for `authenticated`; writes only through migrations.
- Custom nodes: owner-only (`owner_id = auth.uid()`).
- All `prep_*` user tables: owner-only select/insert/update/delete (`user_id = auth.uid()`). `prep_events` is append-only (no update/delete privilege; supersede instead) and `prep_topic_state` is read-only to users (trigger-maintained). Rows may only reference syllabus nodes the owner can see. Anonymous visitors have no table privileges.
- Mentors get **no direct table policies**. They read through security-definer RPCs (`prep_student_summary(circle, student)`) that check `is_circle_admin(circle)`, the student's membership in that circle, and the `prep_mentor_shares` scope, returning only the allowed fields.
- RLS tests (local Postgres harness, run before each SQL hand-off): owner can read/write; other student cannot; mentor of another batch cannot; mentor with `summary` scope gets summary only; `nothing` returns nothing.

## 5. Exam-template strategy
- One generic node tree; exam rules live in data, not code. UPSC CSE v1 seeded from the official notification (stages → papers → subjects → topics): 101 core topics plus Paper I/II nodes for the 26 optional subjects (153 topic nodes), generated by `supabase/seed/upsc_cse_v1.py`. Students may add private custom subtopics under any topic.
- NCERT path = `ncert_book`/`ncert_chapter` nodes ordered Class 12 → 5, linked to subjects.
- State PCS = a template with `base_template_id = civil_services_base` plus overlay nodes (state history, geography, etc.). CAT gets its own template after discovery. No CAT scoring rules are invented.

## 6. Deterministic scoring and versioning
- Pure TypeScript module `lib/prep/scoring/v1.ts` (no I/O): input = topic states + logs; output = each indicator `{ value | null, band, reasons[] }`. `null` renders "Not enough evidence".
- Indicators: syllabus touched, foundation complete, evidence-backed, revision-current (all % of weighted mapped nodes); Prelims, Mains, CSAT safety, Optional readiness as an index (0–100, never shown as "100% ready") mapped to six bands.
- Revision interval rule v1 in SQL (`prep_next_interval(count)`: 3 → 7 → 15 → 30 → ×1.5, capped at 90 days), mirrored in TypeScript, and versioned by `algorithm_version` on every derived row.
- Every number has a "Why?" from `reasons[]` (e.g. "Fundamental Rights last revised 16 days ago; interval is 14 days").
- Changing a formula means a new version file (`v2.ts`). Snapshots keep the version they were computed with.
- Unit tests (Vitest) cover every band edge and the "not enough evidence" cases.

## 7. Feature flag
- `prep_profiles.feature_enabled` plus a `prep_beta` allow-list table (admins via `app_admins`). A `/prep` route and nav entry appear only when `has_feature('prep')` returns true. Production stays unchanged for everyone else.

## 8. Milestone 1 plan (schema, RLS, template foundation)
1. `supabase/migrations/2026111xxxxx_prep_foundation.sql`: tables in §3 (except plans/vault), enums, CHECKs, indexes, RLS, `prep_next_interval`, `prep_topic_state` trigger, `has_feature()`, `prep_beta`.
2. `supabase/migrations/2026111xxxxx_prep_upsc_template.sql`: UPSC CSE v1 seed (stages, papers, subjects, topics; optional papers; NCERT path skeleton).
3. `supabase/tests/prep_rls.sql`: cross-user and cross-batch access tests (run against local Postgres).
4. `lib/prep/types.ts`, `lib/prep/scoring/v1.ts` (+ `v1.test.ts` once Vitest is added), `lib/prep/revision.ts`.
5. `lib/prep/feature.ts` (`usePrepFeature()`), hidden `app/prep/page.tsx` placeholder behind the flag.
6. Docs: update STATUS with migration order and test results.

## 12. Subtopics, decay, state exams and the time-bound plan (v2, Nov 2026)
**Evidence unit.** The official subtopic. Ticking a subtopic logs `studied` on it (and on its topic the first time, which starts the topic's revision schedule). Unticking logs `studied` with `{"undo": true}`. Subtopics have no revision schedule of their own; revision is per topic.

**Scoring v2.** For each topic: `share` = ticked official subtopics / official subtopics (a topic without subtopics counts 1 once studied). `peak = 0.4·share + 0.3·practice + 0.3·revision`, `current = strength·peak`, where strength = 1 until the next revision is due, then falls linearly to 0.25 over max(14, 2 × interval) days. Index = weighted mean × 100, capped at 95, null under 5 started topics. Coverage indicators use `share` and never fade.

**Templates.** `upsc_cse_v1`, `uppcs_v1`, `bpsc_v1`, `jkpsc_cce_v1`, all with the same stage codes (PRE, MAI, INT, NCERT). Topic state is per node, so ticks for each exam are kept separately. State templates leave PYQ frequency empty.

**Pace plan v1 (`lib/prep/pace.ts`).** Units = official subtopics (or subtopic-less topics) of the target stage in syllabus order, optional papers excluded. `revisionDays = round(totalDays × buffer%)` (default 15). `perDay = ceil(units remaining at the start of today / study days left)`. Expected-by-today is linear over the study days; `behindBy` against it gives on track / slightly behind (≤ 2 days of target) / behind. Today's list = the next unticked units; ticks made today count towards today. A realism note appears when perDay × 40 min exceeds 80% of the stated daily hours.

**Reminder.** `notify_prep_reminders()` runs at :30 UTC every hour. It sends one `prep_reminder` per beta user per day at their `reminder_hour` (India time), skipped if they have any `prep_events` that day. The text is built from the last target the app computed (`daily_target`, if from today or yesterday), the topic revisions due, and the days to the exam.
