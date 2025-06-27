
-- Ensure demo users have proper profile data with onboarding completed
INSERT INTO profiles (id, email, full_name, company_name, role_type, onboarding_completed, profile_completion_score, status)
VALUES 
  -- Demo customer profile
  ((SELECT id FROM auth.users WHERE email = 'demo.customer@allrentz.com'), 
   'demo.customer@allrentz.com', 
   'Pat Johnson', 
   'Gulf Coast Refinery', 
   'customer', 
   true, 
   100, 
   'active'),
  -- Demo vendor profile  
  ((SELECT id FROM auth.users WHERE email = 'demo.vendor@allrentz.com'),
   'demo.vendor@allrentz.com',
   'Mike Rodriguez', 
   'Pat-Rentals Equipment Co',
   'vendor',
   true,
   100,
   'active')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  company_name = EXCLUDED.company_name,
  role_type = EXCLUDED.role_type,
  onboarding_completed = EXCLUDED.onboarding_completed,
  profile_completion_score = EXCLUDED.profile_completion_score,
  status = EXCLUDED.status;

-- Add some sample notifications for demo customer
INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'demo.customer@allrentz.com'),
  'Quote Approved',
  'Your quote for Industrial Pump rental has been approved. Valid for 24 hours.',
  'success',
  false,
  NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (
  SELECT 1 FROM notifications 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo.customer@allrentz.com')
  AND title = 'Quote Approved'
);

INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'demo.customer@allrentz.com'),
  'Delivery Scheduled',
  'Equipment delivery scheduled for tomorrow 8:00 AM at Refinery Main Site.',
  'info',
  false,
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (
  SELECT 1 FROM notifications 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo.customer@allrentz.com')
  AND title = 'Delivery Scheduled'
);

-- Add sample equipment if none exists
INSERT INTO equipment (title, category, daily_rate, location, description, available, vendor_id)
SELECT 
  'Industrial Centrifugal Pump - 500 GPM',
  'Pumps',
  350.00,
  'Houston, TX',
  'High-capacity centrifugal pump suitable for refinery operations. ANSI rated, explosion-proof motor.',
  true,
  (SELECT id FROM auth.users WHERE email = 'demo.vendor@allrentz.com')
WHERE NOT EXISTS (
  SELECT 1 FROM equipment WHERE title LIKE '%Centrifugal Pump%'
);

-- Add sample rental request for demo customer
INSERT INTO rental_requests (customer_id, equipment_id, start_date, end_date, total_amount, delivery_address, special_requirements, status, created_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'demo.customer@allrentz.com'),
  (SELECT id FROM equipment WHERE title LIKE '%Centrifugal Pump%' LIMIT 1),
  CURRENT_DATE + 1,
  CURRENT_DATE + 8,
  2450.00,
  '1250 Industrial Blvd, Houston, TX 77015',
  'TWIC required for delivery. H2S trained operator needed.',
  'approved',
  NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (
  SELECT 1 FROM rental_requests 
  WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'demo.customer@allrentz.com')
);
