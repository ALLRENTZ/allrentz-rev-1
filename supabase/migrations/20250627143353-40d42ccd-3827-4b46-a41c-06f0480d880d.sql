
-- Update existing equipment records to use new category taxonomy
-- This maps old categories to the new MVP categories

UPDATE equipment 
SET category = CASE 
  WHEN category IN ('Boilers', 'Power Generation', 'Compressors') THEN 'Power, Climate & Fluids'
  WHEN category IN ('Storage', 'Storage & Frac Tanks') THEN 'Storage & Containment'
  WHEN category IN ('Safety', 'Safety & Monitoring') THEN 'Inspection, Safety & Compliance'
  WHEN category IN ('Cleaning', 'Cleaning & Decontamination') THEN 'Cleaning & Remediation'
  WHEN category IN ('Material Handling') THEN 'Core Heavy Equipment'
  WHEN category IN ('Testing & Instrumentation') THEN 'Refinery & Process Tools'
  -- Default mapping for any other categories
  ELSE 'Core Heavy Equipment'
END
WHERE category IS NOT NULL;

-- Add some sample equipment for new categories if needed
INSERT INTO equipment (title, description, category, daily_rate, location, image_url, available, specifications, compliance_tags)
VALUES 
('Mobile Welding Station', 'Portable welding equipment with full piping capabilities', 'Fabrication & Field Services', 380, 'Houston, TX', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop', true, '{"welding_types": "MIG/TIG/Stick", "power": "220V/440V"}', ARRAY['TWIC', 'AWS-Certified']),
('ROV Tooling Package', 'Complete subsea ROV tooling for offshore operations', 'Offshore & Marine', 1200, 'Port Arthur, TX', 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=400&h=300&fit=crop', true, '{"depth_rating": "3000ft", "tools": "cutting/lifting/inspection"}', ARRAY['TWIC', 'Subsea-Certified'])
ON CONFLICT (id) DO NOTHING;
