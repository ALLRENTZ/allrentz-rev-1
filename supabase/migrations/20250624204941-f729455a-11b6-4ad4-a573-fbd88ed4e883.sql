
-- Create user profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  company_name text,
  phone text,
  role text CHECK (role IN ('customer', 'vendor', 'admin')) DEFAULT 'customer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create equipment table
CREATE TABLE public.equipment (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  daily_rate decimal(10,2) NOT NULL,
  location text NOT NULL,
  available boolean DEFAULT true,
  image_url text,
  specifications jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create rental requests table
CREATE TABLE public.rental_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.profiles(id),
  equipment_id uuid REFERENCES public.equipment(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_amount decimal(10,2),
  status text CHECK (status IN ('pending', 'quoted', 'approved', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
  delivery_address text,
  special_requirements text,
  quote_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for equipment (vendors can manage their own, everyone can view)
CREATE POLICY "Anyone can view equipment" ON public.equipment
  FOR SELECT USING (true);
CREATE POLICY "Vendors can manage own equipment" ON public.equipment
  FOR ALL USING (auth.uid() = vendor_id);

-- RLS Policies for rental requests
CREATE POLICY "Users can view own rental requests" ON public.rental_requests
  FOR SELECT USING (auth.uid() = customer_id OR auth.uid() IN (SELECT vendor_id FROM equipment WHERE id = equipment_id));
CREATE POLICY "Customers can create rental requests" ON public.rental_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update own rental requests" ON public.rental_requests
  FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() IN (SELECT vendor_id FROM equipment WHERE id = equipment_id));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert demo equipment data
INSERT INTO public.equipment (id, vendor_id, title, description, category, daily_rate, location, image_url, specifications) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', NULL, 'Industrial Steam Boiler - 150 HP', 'High-efficiency steam boiler perfect for refinery operations', 'Boilers', 850.00, 'Houston, TX', 'https://images.unsplash.com/photo-1565008447742-97f6717d4e89?w=400&h=300&fit=crop', '{"pressure": "150 PSI", "fuel": "Natural Gas", "certified": "ASME"}'),
  ('550e8400-e29b-41d4-a716-446655440002', NULL, '21K Gallon Frac Tank', 'Vacuum-ready storage tank for industrial fluids', 'Storage', 125.00, 'Beaumont, TX', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop', '{"capacity": "21000 gallons", "material": "Steel", "vacuum_ready": true}'),
  ('550e8400-e29b-41d4-a716-446655440003', NULL, 'Diesel Generator - 500 KW', 'Reliable backup power for critical operations', 'Power Generation', 650.00, 'Port Arthur, TX', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop', '{"power": "500 KW", "fuel": "Diesel", "runtime": "24 hours"}');
