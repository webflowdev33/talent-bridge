-- Add question_count column to jobs table for admin to decide number of questions
ALTER TABLE public.jobs 
ADD COLUMN question_count integer DEFAULT 10;