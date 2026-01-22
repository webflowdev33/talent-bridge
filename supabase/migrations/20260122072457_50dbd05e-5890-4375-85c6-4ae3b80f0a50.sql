-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS guide_acknowledged BOOLEAN DEFAULT false;

-- Create job_rounds table for storing round-specific information
CREATE TABLE IF NOT EXISTS public.job_rounds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on job_rounds
ALTER TABLE public.job_rounds ENABLE ROW LEVEL SECURITY;

-- Create policies for job_rounds
CREATE POLICY "Admins can manage job_rounds" 
ON public.job_rounds 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view job_rounds for active jobs" 
ON public.job_rounds 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_rounds.job_id AND jobs.is_active = true
));

-- Create unique constraint to prevent duplicate round numbers per job
CREATE UNIQUE INDEX IF NOT EXISTS job_rounds_job_round_unique 
ON public.job_rounds(job_id, round_number);