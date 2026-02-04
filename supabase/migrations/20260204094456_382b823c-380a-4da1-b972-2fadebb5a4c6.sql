-- Add test_time_minutes column to jobs table
ALTER TABLE public.jobs ADD COLUMN test_time_minutes integer DEFAULT 15;

-- Add test_time_minutes column to job_templates table for consistency
ALTER TABLE public.job_templates ADD COLUMN test_time_minutes integer DEFAULT 15;