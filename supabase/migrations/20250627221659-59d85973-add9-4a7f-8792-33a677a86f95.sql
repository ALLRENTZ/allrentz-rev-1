
-- Mark demo accounts as email confirmed so they can sign in immediately
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email IN ('demo.customer@allrentz.com', 'demo.vendor@allrentz.com');
