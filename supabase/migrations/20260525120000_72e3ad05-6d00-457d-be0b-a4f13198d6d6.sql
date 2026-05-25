-- P0-1: Eliminate self-service role escalation
--
-- Three attack paths closed:
--   A. Authenticated users could INSERT any role into user_roles (no role-value check in RLS policy)
--   B. Anyone signing up could pass role:'admin' in raw_user_meta_data and have it trusted
--   C. Authenticated users could UPDATE profiles.role_type directly (no column restriction)
--
-- Fixes:
--   A. Drop the user_roles INSERT policy — only SECURITY DEFINER functions may write roles
--   B. REVOKE column-level UPDATE on profiles.role_type from authenticated
--   C. Harden handle_new_user() to accept only 'vendor' from metadata; all else defaults to 'customer'
--
-- Rollback (emergency only — reintroduces the vulnerabilities):
--   CREATE POLICY "Users insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
--   GRANT UPDATE (role_type) ON public.profiles TO authenticated;
--   [restore old handle_new_user body with unconstrained raw_user_meta_data->>'role' cast]


-- Fix A: Remove direct client write access to user_roles.
-- The handle_new_user() trigger (SECURITY DEFINER) and any future admin
-- role-assignment functions (also SECURITY DEFINER) bypass RLS, so they
-- are unaffected by this DROP.
DROP POLICY IF EXISTS "Users insert own roles" ON public.user_roles;


-- Fix B: Revoke column-level UPDATE on role_type from authenticated users.
-- The "Users update own profile" row-level policy remains intact for all
-- other columns (full_name, company_name, etc.).
-- SECURITY DEFINER functions retain write access to role_type.
REVOKE UPDATE (role_type) ON public.profiles FROM authenticated;


-- Fix C: Harden handle_new_user() against metadata role injection.
-- Only 'vendor' is accepted from raw_user_meta_data. 'admin' and 'manager'
-- cannot be assigned via signup regardless of what metadata is supplied.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  -- Explicit allowlist: only 'vendor' may be requested via signup metadata.
  -- 'admin' and 'manager' require backend-only assignment; raw_user_meta_data
  -- is user-controlled and must never be trusted for elevated roles.
  _role := CASE
    WHEN new.raw_user_meta_data->>'role' = 'vendor' THEN 'vendor'::public.app_role
    ELSE 'customer'::public.app_role
  END;

  INSERT INTO public.profiles (id, email, full_name, role_type)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''), _role);

  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, _role)
  ON CONFLICT DO NOTHING;

  IF _role = 'vendor' THEN
    INSERT INTO public.vendor_profiles (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.customer_profiles (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
