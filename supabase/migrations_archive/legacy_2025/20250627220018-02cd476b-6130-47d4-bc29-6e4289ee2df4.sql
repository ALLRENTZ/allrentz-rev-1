
-- Insert demo equipment data for Pat-Rentals vendor
INSERT INTO equipment (
  title, category, vendor_id, daily_rate, available, specifications, 
  response_time_hours, delivery_radius_miles, minimum_rental_days, 
  requires_operator, hazmat_certified, image_url, description, 
  compliance_tags, location
) VALUES 
(
  'Steam Boiler - 200 HP Industrial',
  'Boilers',
  (SELECT id FROM profiles WHERE email = 'demo.vendor@allrentz.com'),
  950.00,
  true,
  '{"capacity": "200 HP", "fuel_type": "Natural Gas", "certification": "ASME Certified", "pressure_rating": "150 PSI", "temperature_rating": "400°F"}',
  2,
  75,
  3,
  true,
  true,
  'https://images.unsplash.com/photo-1565008447742-97f6717d4e89?w=400&h=300&fit=crop',
  'High-efficiency industrial steam boiler perfect for refinery operations. ASME certified with full documentation package.',
  ARRAY['ASME Certified', 'Refinery-Ready', 'Turnaround Certified', 'HAZMAT Approved'],
  'Houston, TX'
),
(
  'Frac Tank - 25,000 Gallon Storage',
  'Storage',
  (SELECT id FROM profiles WHERE email = 'demo.vendor@allrentz.com'),
  175.00,
  true,
  '{"capacity": "25000 gallons", "material": "Steel Construction", "certification": "DOT Approved", "dimensions": "40ft x 8ft x 8ft"}',
  1,
  100,
  1,
  false,
  true,
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
  'Large capacity storage tank for industrial fluids and wastewater. DOT approved for hazardous materials.',
  ARRAY['DOT Approved', 'Refinery-Ready', 'HAZMAT Approved'],
  'Houston, TX'
),
(
  'Industrial Chiller - 300 Ton',
  'HVAC & Environmental',
  (SELECT id FROM profiles WHERE email = 'demo.vendor@allrentz.com'),
  1250.00,
  false,
  '{"capacity": "300 tons", "refrigerant": "R-134a", "power": "460V 3-Phase", "monitoring": "Remote Capable"}',
  4,
  50,
  7,
  false,
  false,
  'https://images.unsplash.com/photo-1614200983771-f5de42f2fe0c?w=400&h=300&fit=crop',
  'High-capacity industrial chiller for process cooling applications. Remote monitoring capabilities included.',
  ARRAY['Remote Monitoring', 'Energy Efficient'],
  'Houston, TX'
);

-- Insert sample rental requests for Pat - Refinery
INSERT INTO rental_requests (
  customer_id, equipment_id, start_date, end_date, status, 
  delivery_address, special_requirements, total_amount, quote_expires_at
) VALUES 
(
  (SELECT id FROM profiles WHERE email = 'demo.customer@allrentz.com'),
  (SELECT id FROM equipment WHERE title = 'Steam Boiler - 200 HP Industrial'),
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '10 days',
  'approved',
  '1234 Refinery Rd, Houston, TX 77001',
  'Requires certified operator and full safety documentation. Unit needed for turnaround maintenance.',
  6650.00,
  CURRENT_DATE + INTERVAL '2 days'
),
(
  (SELECT id FROM profiles WHERE email = 'demo.customer@allrentz.com'),
  (SELECT id FROM equipment WHERE title = 'Frac Tank - 25,000 Gallon Storage'),
  CURRENT_DATE + INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '14 days',
  'pending',
  '1234 Refinery Rd, Houston, TX 77001',
  'Tank needed for temporary storage during maintenance operations. HAZMAT certified required.',
  2275.00,
  CURRENT_DATE + INTERVAL '1 day'
);

-- Insert notifications for both demo users
INSERT INTO notifications (user_id, type, title, message, read) VALUES 
(
  (SELECT id FROM profiles WHERE email = 'demo.customer@allrentz.com'),
  'success',
  'Rental Request Approved',
  'Your Steam Boiler rental request has been approved by Pat-Rentals. Equipment will be delivered on schedule.',
  false
),
(
  (SELECT id FROM profiles WHERE email = 'demo.customer@allrentz.com'),
  'info',
  'Quote Expiring Soon',
  'Your quote for the Frac Tank rental expires in 24 hours. Please approve to secure your booking.',
  false
),
(
  (SELECT id FROM profiles WHERE email = 'demo.vendor@allrentz.com'),
  'info',
  'New Rental Request',
  'Pat - Refinery has submitted a new rental request for your Frac Tank. Review and respond within 4 hours.',
  false
),
(
  (SELECT id FROM profiles WHERE email = 'demo.vendor@allrentz.com'),
  'success',
  'Payment Processed',
  'Payment of $6,650 has been processed for the Steam Boiler rental to Pat - Refinery.',
  true
);

-- Update demo profiles with more realistic company information
UPDATE profiles SET 
  company_name = 'Gulf Coast Refinery',
  company_type = 'Oil & Gas Refining',
  profile_completion_score = 85,
  onboarding_completed = true
WHERE email = 'demo.customer@allrentz.com';

UPDATE profiles SET 
  company_name = 'Pat-Rentals Equipment Co',
  company_type = 'Industrial Equipment Rental',
  profile_completion_score = 92,
  onboarding_completed = true
WHERE email = 'demo.vendor@allrentz.com';

-- Create customer profile details
INSERT INTO customer_profiles (
  user_id, site_addresses, safety_requirements, payment_terms, 
  purchase_order_required, twic_required, isnet_required
) VALUES (
  (SELECT id FROM profiles WHERE email = 'demo.customer@allrentz.com'),
  '[{"name": "Main Refinery", "address": "1234 Refinery Rd, Houston, TX 77001", "type": "primary"}, {"name": "Storage Terminal", "address": "5678 Terminal Blvd, Houston, TX 77002", "type": "secondary"}]',
  '{"hazmat_required": true, "twic_required": true, "safety_training": "OSHA 30", "confined_space": true}',
  'NET15',
  true,
  true,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  site_addresses = EXCLUDED.site_addresses,
  safety_requirements = EXCLUDED.safety_requirements,
  payment_terms = EXCLUDED.payment_terms,
  purchase_order_required = EXCLUDED.purchase_order_required,
  twic_required = EXCLUDED.twic_required,
  isnet_required = EXCLUDED.isnet_required;

-- Create vendor profile details
INSERT INTO vendor_profiles (
  user_id, verified, performance_rating, compliance_score, 
  response_time_avg, specialties, coverage_areas
) VALUES (
  (SELECT id FROM profiles WHERE email = 'demo.vendor@allrentz.com'),
  true,
  4.8,
  95,
  2,
  ARRAY['Industrial Boilers', 'Storage Tanks', 'Process Equipment', 'HVAC Systems'],
  ARRAY['Houston Metro', 'Gulf Coast', 'Texas Triangle']
) ON CONFLICT (user_id) DO UPDATE SET
  verified = EXCLUDED.verified,
  performance_rating = EXCLUDED.performance_rating,
  compliance_score = EXCLUDED.compliance_score,
  response_time_avg = EXCLUDED.response_time_avg,
  specialties = EXCLUDED.specialties,
  coverage_areas = EXCLUDED.coverage_areas;
