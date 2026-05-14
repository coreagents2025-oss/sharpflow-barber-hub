-- Drop overly-permissive cash_flow INSERT policy.
-- The sync_payment_to_cash_flow() trigger is SECURITY DEFINER and bypasses RLS,
-- so this policy is not needed and was allowing any authenticated user
-- to insert arbitrary financial records.
DROP POLICY IF EXISTS "Allow insert via trigger" ON public.cash_flow;

-- Ensure all public-facing views run with the querying user's permissions
-- (security_invoker=on) instead of the view creator's, so RLS is respected.
ALTER VIEW public.public_appointment_slots SET (security_invoker = on);
ALTER VIEW public.public_barbers SET (security_invoker = on);
ALTER VIEW public.public_barbershops SET (security_invoker = on);
ALTER VIEW public.public_profiles SET (security_invoker = on);
ALTER VIEW public.appointments_with_client SET (security_invoker = on);
ALTER VIEW public.payment_cash_flow_audit SET (security_invoker = on);