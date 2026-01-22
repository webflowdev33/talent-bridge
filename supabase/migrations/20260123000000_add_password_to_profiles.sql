-- Add password column to profiles table
-- This will store the user's password
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.password IS 'Password stored for user account';
