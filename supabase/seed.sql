-- supabase/seed.sql
--
-- Demo seed for local development and CI only.
-- Runs automatically after every `supabase db reset`.
-- DOES NOT run in Supabase production deployments.
--
-- All credentials below are local-dev-only placeholders.
-- They are NOT production credentials.
-- Do not use demo123456 as a real account password in any deployed environment.
--
-- Stable UUIDs — deterministic across every reset:
--   Demo customer user:   d1e0c001-0000-0000-0000-000000000001
--   Demo vendor user:     d1e0c001-0000-0000-0000-000000000002
--   Demo customer org:    d1e0c001-0000-0000-0000-000000000011
--   Demo vendor org:      d1e0c001-0000-0000-0000-000000000012

-- ============================================================
-- DEMO AUTH USERS
-- The handle_new_user trigger fires on INSERT and creates:
--   public.profiles, public.user_roles, public.customer_profiles
--   or public.vendor_profiles
-- Do not insert into those tables here — let the trigger handle it.
-- ============================================================

-- Demo customer user (trigger assigns role_type = customer)
-- instance_id: 00000000-... required for GoTrue local dev signIn routing.
-- Token fields must be '' not NULL — GoTrue scanner rejects NULL strings.
INSERT INTO auth.users (
  instance_id, id, email, email_confirmed_at, encrypted_password,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, reauthentication_token,
  created_at, updated_at, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd1e0c001-0000-0000-0000-000000000001',
  'demo.customer@allrentz.com',
  now(),
  crypt('demo123456', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '', '', '', '', '',
  now(), now(),
  'authenticated', 'authenticated'
) ON CONFLICT DO NOTHING;

-- Demo vendor user (raw_user_meta_data role=vendor — trigger assigns role_type = vendor)
-- instance_id: 00000000-... required for GoTrue local dev signIn routing.
-- Token fields must be '' not NULL — GoTrue scanner rejects NULL strings.
INSERT INTO auth.users (
  instance_id, id, email, email_confirmed_at, encrypted_password,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, reauthentication_token,
  created_at, updated_at, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd1e0c001-0000-0000-0000-000000000002',
  'demo.vendor@allrentz.com',
  now(),
  crypt('demo123456', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  '{"role":"vendor"}',
  '', '', '', '', '',
  now(), now(),
  'authenticated', 'authenticated'
) ON CONFLICT DO NOTHING;

-- Email identity rows required by GoTrue for signInWithPassword.
-- provider_id = user UUID (email provider convention in this Supabase version).
-- identity_data must include sub, email, email_verified, phone_verified.

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'd1e0c001-0000-0000-0000-000000001001',
  'd1e0c001-0000-0000-0000-000000000001',
  '{"sub":"d1e0c001-0000-0000-0000-000000000001","email":"demo.customer@allrentz.com","email_verified":false,"phone_verified":false}',
  'email',
  'd1e0c001-0000-0000-0000-000000000001',
  now(), now(), now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'd1e0c001-0000-0000-0000-000000001002',
  'd1e0c001-0000-0000-0000-000000000002',
  '{"sub":"d1e0c001-0000-0000-0000-000000000002","email":"demo.vendor@allrentz.com","email_verified":false,"phone_verified":false}',
  'email',
  'd1e0c001-0000-0000-0000-000000000002',
  now(), now(), now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- ============================================================
-- DEMO PROFILE FLAGS
-- Trigger already created both profile rows above.
-- Set is_demo = true so the frontend shows demo mode correctly.
-- ============================================================

UPDATE public.profiles
SET is_demo = true
WHERE id IN (
  'd1e0c001-0000-0000-0000-000000000001'::uuid,
  'd1e0c001-0000-0000-0000-000000000002'::uuid
);

-- ============================================================
-- DEMO ORGANIZATIONS
-- is_simulated = true — Demo Isolation Rule enforced.
-- ============================================================

-- Demo customer organization
INSERT INTO public.organizations (
  id, name, org_type, city, state,
  is_simulated, verified, primary_contact_user_id
) VALUES (
  'd1e0c001-0000-0000-0000-000000000011',
  'Demo Refinery Operations',
  'customer',
  'Houston', 'TX',
  true, true,
  'd1e0c001-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Demo vendor organization
INSERT INTO public.organizations (
  id, name, org_type, city, state,
  is_simulated, verified, primary_contact_user_id
) VALUES (
  'd1e0c001-0000-0000-0000-000000000012',
  'Demo Equipment Supply Co.',
  'vendor',
  'Beaumont', 'TX',
  true, true,
  'd1e0c001-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO MEMBERSHIPS
-- is_simulated = true enforced on all memberships.
-- ============================================================

-- Demo customer user = owner of demo customer org
INSERT INTO public.organization_memberships (
  organization_id, user_id, role, is_simulated
) VALUES (
  'd1e0c001-0000-0000-0000-000000000011',
  'd1e0c001-0000-0000-0000-000000000001',
  'owner',
  true
) ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Demo vendor user = owner of demo vendor org
INSERT INTO public.organization_memberships (
  organization_id, user_id, role, is_simulated
) VALUES (
  'd1e0c001-0000-0000-0000-000000000012',
  'd1e0c001-0000-0000-0000-000000000002',
  'owner',
  true
) ON CONFLICT (organization_id, user_id) DO NOTHING;
