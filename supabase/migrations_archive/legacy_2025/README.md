# Legacy Migration Archive — 2025 Pre-Project Migrations

## What These Are

These 6 migration files were written between June and July 2025 but belong to a prior Supabase project lifecycle. They were NEVER applied to the current ALLRENTZ project.

## Why They Were Archived

The current ALLRENTZ Supabase project (`encqbibzgoarvtcivgra`) was created on 2025-09-24, after these files were written. The project's authoritative migration baseline is `20260520165815_d4d1e16d`, applied in May 2026.

Confirmed via `supabase_migrations` table inspection on 2026-05-25: zero rows exist for any 20250627 or 20250702 version. All 5 applied migrations begin with 20260520 or 20260521.

## Why They Cannot Return to supabase/migrations/

If any of these files are moved back to `supabase/migrations/`, `supabase db push` will attempt to apply them against a live schema where:

- `CREATE TYPE public.app_role` already exists (conflict with migration 1)
- `CREATE TABLE public.smart_draft_quotes` already exists (conflict with migration 6)
- `ALTER TABLE public.profiles` assumes profiles does not yet exist (migration 1 has no CREATE TABLE for profiles)

Applying them would fail with a duplicate object error and could corrupt the `supabase_migrations` tracking table.

## Files Archived

| File | Original Purpose |
|------|-----------------|
| `20250627024447-670e54a3-...sql` | Initial schema (app_role, user_roles with updated_at, vendor_profiles) |
| `20250627143353-40d42ccd-...sql` | Equipment category data migration + sample equipment |
| `20250627220018-02cd476b-...sql` | Demo data seed (pricing, compliance_score, rental_requests) |
| `20250627221659-59d85973-...sql` | auth.users mutation (email_confirmed_at) — governance violation |
| `20250627224314-94ef10d5-...sql` | Additional demo profiles and notifications |
| `20250702115605-c3f41adc-...sql` | smart_draft_quotes table (also defined in migration 7 — direct conflict) |

## Authoritative Baseline

The surviving migration chain in `supabase/migrations/` (migrations 7–11) is the only authoritative schema lineage for this project. Migration 7 (`20260520165815_d4d1e16d`) creates all tables from scratch and is the production baseline.

Do not delete these archive files without reviewing what RLS policies, demo data patterns, or historical schema decisions they document.
