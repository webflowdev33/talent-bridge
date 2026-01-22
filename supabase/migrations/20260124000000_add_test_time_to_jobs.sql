-- Add test_time_minutes column to jobs table
-- This will store the test duration in minutes (e.g., 15 for 15 minutes)
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS test_time_minutes INTEGER DEFAULT 60;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.test_time_minutes IS 'Test duration in minutes. Default is 60 minutes.';
