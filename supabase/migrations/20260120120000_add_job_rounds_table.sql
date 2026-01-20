-- Create job_rounds table to track interview rounds per job
CREATE TABLE public.job_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    round_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (job_id, round_number)
);

-- Enable RLS on job_rounds
ALTER TABLE public.job_rounds ENABLE ROW LEVEL SECURITY;

-- Anyone (candidates) can view job rounds
CREATE POLICY "Anyone can view job rounds" 
ON public.job_rounds
FOR SELECT
USING (true);

-- Admins can manage job rounds
CREATE POLICY "Admins can manage job rounds" 
ON public.job_rounds
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

