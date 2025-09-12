
-- Create table for Smart Draft quotes
CREATE TABLE public.smart_draft_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES auth.users NOT NULL,
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
  add_on_options jsonb DEFAULT '{}',
  vendor_confirmed boolean DEFAULT false,
  vendor_adjusted_rate numeric,
  vendor_notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_vendor', 'vendor_confirmed', 'quote_finalized')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_draft_quotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Customers can manage their own smart drafts"
  ON public.smart_draft_quotes
  FOR ALL
  USING (auth.uid() = customer_id);

CREATE POLICY "Vendors can view and update drafts for their equipment"
  ON public.smart_draft_quotes
  FOR SELECT
  USING (auth.uid()::text = matched_vendor_id::text);

CREATE POLICY "Vendors can update drafts assigned to them"
  ON public.smart_draft_quotes
  FOR UPDATE
  USING (auth.uid()::text = matched_vendor_id::text);
