-- Stage 1: contain client-writable profile and platform-role authority.
--
-- This migration intentionally does not define account-status semantics or an
-- audited privileged-role assignment command. Those are separate Stage 2
-- design and verification requirements.

-- Existing rows must have explicit values before the columns become required.
UPDATE public.profiles
SET role_type = 'customer'::public.app_role
WHERE role_type IS NULL;

UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role_type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Profile creation remains owned by the SECURITY DEFINER handle_new_user()
-- trigger. No profile field is currently classified as safe for direct client
-- mutation, so Stage 1 grants read-only access rather than preserving the
-- former broad UPDATE path.
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Platform roles are backend authority. Retain only the existing self-read
-- policy for authenticated users; all direct client mutation remains denied.
DROP POLICY IF EXISTS "Users insert own roles" ON public.user_roles;

REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
