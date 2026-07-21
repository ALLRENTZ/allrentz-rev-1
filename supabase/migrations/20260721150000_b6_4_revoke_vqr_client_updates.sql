-- Prevent authenticated clients from moving or rewriting vendor quotes.
-- Quote acceptance remains controlled by the backend transition function.

DROP POLICY IF EXISTS vqr_update_vendor
  ON public.vendor_quote_responses;

REVOKE UPDATE ON public.vendor_quote_responses
  FROM authenticated, anon;