
-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('customer', 'vendor', 'admin', 'manager');

-- Update profiles table to use the enum and add more fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_type public.app_role DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS company_type text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completion_score integer DEFAULT 0;

-- Create user_roles table for more flexible role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create vendor_profiles table for vendor-specific data
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    business_license text,
    insurance_policy text,
    coverage_areas text[],
    specialties text[],
    response_time_avg integer DEFAULT 0, -- in minutes
    compliance_score integer DEFAULT 0, -- 0-100
    performance_rating decimal(3,2) DEFAULT 0.0, -- 0.00-5.00
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on vendor_profiles
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vendor_profiles
CREATE POLICY "Vendors can manage their own profile"
  ON public.vendor_profiles
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view verified vendor profiles"
  ON public.vendor_profiles
  FOR SELECT
  USING (verified = true);

-- Create customer_profiles table for customer-specific data
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    site_addresses jsonb DEFAULT '[]'::jsonb,
    safety_requirements jsonb DEFAULT '{}'::jsonb,
    preferred_vendors uuid[] DEFAULT '{}',
    payment_terms text DEFAULT 'NET30',
    purchase_order_required boolean DEFAULT false,
    twic_required boolean DEFAULT false,
    isnet_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on customer_profiles
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_profiles
CREATE POLICY "Customers can manage their own profile"
  ON public.customer_profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- Create smart_match_requests table to track matching requests
CREATE TABLE IF NOT EXISTS public.smart_match_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    equipment_type text NOT NULL,
    location text NOT NULL,
    urgency text NOT NULL,
    additional_requirements jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'processing',
    matched_vendors jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on smart_match_requests
ALTER TABLE public.smart_match_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for smart_match_requests
CREATE POLICY "Customers can manage their own match requests"
  ON public.smart_match_requests
  FOR ALL
  USING (auth.uid() = customer_id);

-- Update the equipment table to add more vendor management fields
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS compliance_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS response_time_hours integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS delivery_radius_miles integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS minimum_rental_days integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS requires_operator boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hazmat_certified boolean DEFAULT false;

-- Update handle_new_user function to handle role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, role_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  );
  
  -- Create role-specific profile
  IF COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'customer') = 'vendor' THEN
    INSERT INTO public.vendor_profiles (user_id) VALUES (new.id);
  ELSE
    INSERT INTO public.customer_profiles (user_id) VALUES (new.id);
  END IF;
  
  RETURN new;
END;
$$;
