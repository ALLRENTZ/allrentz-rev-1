-- P0-4: Set is_demo = true for demo accounts
--
-- P0-3 added is_demo boolean NOT NULL DEFAULT false to profiles.
-- All accounts default to is_demo = false, including the demo accounts.
-- This migration sets the two demo accounts so the demo flow continues
-- to work after P0-4 enforces profile.is_demo as the demo authority check.
--
-- Depends on: 20260526095022_p0_demo_authority.sql (adds is_demo column)

UPDATE public.profiles
SET is_demo = true
WHERE email IN ('demo.customer@allrentz.com', 'demo.vendor@allrentz.com');
