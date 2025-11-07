-- Fix critical security issues: Restrict public access to sensitive data

-- 1. Fix user_roles table: Users should only see their own role
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

CREATE POLICY "Users can view their own role" 
ON user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Fix bookings table: Require authentication to view bookings
DROP POLICY IF EXISTS "Everyone can view bookings" ON bookings;

CREATE POLICY "Authenticated users can view bookings" 
ON bookings 
FOR SELECT 
USING (auth.role() = 'authenticated');