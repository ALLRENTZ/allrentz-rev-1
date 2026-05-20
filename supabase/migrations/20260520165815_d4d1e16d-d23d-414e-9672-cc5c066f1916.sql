
-- Enums
CREATE TYPE public.app_role AS ENUM ('customer', 'vendor', 'admin', 'manager');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  company_name text,
  company_type text,
  role_type public.app_role DEFAULT 'customer',
  status text DEFAULT 'active',
  onboarding_completed boolean DEFAULT false,
  profile_completion_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vendor profiles
CREATE TABLE public.vendor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  business_license text,
  insurance_policy text,
  coverage_areas text[],
  specialties text[],
  response_time_avg integer DEFAULT 0,
  compliance_score integer DEFAULT 0,
  performance_rating numeric(3,2) DEFAULT 0.0,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own profile" ON public.vendor_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public view verified vendors" ON public.vendor_profiles FOR SELECT USING (verified = true);

-- Customer profiles
CREATE TABLE public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  site_addresses jsonb DEFAULT '[]'::jsonb,
  safety_requirements jsonb DEFAULT '{}'::jsonb,
  preferred_vendors uuid[] DEFAULT '{}',
  payment_terms text DEFAULT 'NET30',
  purchase_order_required boolean DEFAULT false,
  twic_required boolean DEFAULT false,
  isnet_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers manage own profile" ON public.customer_profiles FOR ALL USING (auth.uid() = user_id);

-- Equipment
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  daily_rate numeric,
  location text,
  image_url text,
  available boolean DEFAULT true,
  specifications jsonb DEFAULT '{}'::jsonb,
  compliance_tags text[] DEFAULT '{}',
  response_time_hours integer DEFAULT 4,
  delivery_radius_miles integer DEFAULT 50,
  minimum_rental_days integer DEFAULT 1,
  requires_operator boolean DEFAULT false,
  hazmat_certified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view equipment" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "Vendors manage own equipment" ON public.equipment FOR ALL USING (auth.uid() = vendor_id);

-- Rental requests
CREATE TABLE public.rental_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'pending',
  delivery_address text,
  special_requirements text,
  total_amount numeric,
  quote_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers manage own requests" ON public.rental_requests FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Vendors view requests for own equipment" ON public.rental_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = equipment_id AND e.vendor_id = auth.uid()));

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'info',
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Smart match requests
CREATE TABLE public.smart_match_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  equipment_type text NOT NULL,
  location text NOT NULL,
  urgency text NOT NULL,
  additional_requirements jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'processing',
  matched_vendors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.smart_match_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers manage own match requests" ON public.smart_match_requests FOR ALL USING (auth.uid() = customer_id);

-- Smart draft quotes
CREATE TABLE public.smart_draft_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  equipment_type text NOT NULL,
  job_type text NOT NULL,
  delivery_zip_code text NOT NULL,
  delivery_start_date date NOT NULL,
  delivery_end_date date NOT NULL,
  duration_days integer NOT NULL,
  site_requirements text[] DEFAULT '{}',
  special_instructions text,
  matched_vendor_id uuid,
  matched_vendor_name text,
  matched_vendor_location text,
  estimated_daily_rate numeric,
  estimated_delivery_fee numeric,
  compliance_notes text[],
  add_on_options jsonb DEFAULT '{}'::jsonb,
  vendor_confirmed boolean DEFAULT false,
  vendor_adjusted_rate numeric,
  vendor_notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_vendor', 'vendor_confirmed', 'quote_finalized')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.smart_draft_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers manage own smart drafts" ON public.smart_draft_quotes FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Vendors view assigned drafts" ON public.smart_draft_quotes FOR SELECT USING (auth.uid() = matched_vendor_id);
CREATE POLICY "Vendors update assigned drafts" ON public.smart_draft_quotes FOR UPDATE USING (auth.uid() = matched_vendor_id);

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role := COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'customer');
BEGIN
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
