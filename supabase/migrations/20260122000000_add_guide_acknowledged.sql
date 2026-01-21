-- Add guide_acknowledged column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS guide_acknowledged BOOLEAN DEFAULT false;

-- Add guide_acknowledged_at timestamp for tracking when it was acknowledged
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS guide_acknowledged_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.guide_acknowledged IS 'Indicates if the user has read and acknowledged the walk-in interview guide';
COMMENT ON COLUMN public.profiles.guide_acknowledged_at IS 'Timestamp when the user acknowledged the guide';
