CREATE POLICY "Super admins can view all subscriptions"
ON public.client_subscriptions
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));