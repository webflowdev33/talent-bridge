-- Phase 1: Enhanced Profile System
-- Add education, experience, and skills columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[];

-- Phase 2: Round Mode Configuration
-- Add mode and instructions columns to job_rounds table
ALTER TABLE public.job_rounds 
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'online_aptitude',
ADD COLUMN IF NOT EXISTS instructions text;

-- Phase 3: Candidate Evaluation System
-- Create evaluation_parameters table
CREATE TABLE IF NOT EXISTS public.evaluation_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    max_score integer NOT NULL DEFAULT 10,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create candidate_evaluations table
CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    round_number integer NOT NULL DEFAULT 1,
    evaluator_id uuid NOT NULL,
    overall_remarks text,
    recommendation text NOT NULL DEFAULT 'hold',
    is_visible_to_candidate boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create evaluation_scores table
CREATE TABLE IF NOT EXISTS public.evaluation_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id uuid NOT NULL REFERENCES public.candidate_evaluations(id) ON DELETE CASCADE,
    parameter_id uuid NOT NULL REFERENCES public.evaluation_parameters(id) ON DELETE CASCADE,
    score integer NOT NULL DEFAULT 0,
    remarks text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Phase 4: Enhanced Slot System
-- Add round_number, mode, and venue columns to slots table
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS round_number integer,
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'online',
ADD COLUMN IF NOT EXISTS venue text;

-- Enable RLS on new tables
ALTER TABLE public.evaluation_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_parameters
CREATE POLICY "Admins can manage evaluation_parameters"
ON public.evaluation_parameters FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active evaluation_parameters"
ON public.evaluation_parameters FOR SELECT
USING (is_active = true);

-- RLS Policies for candidate_evaluations
CREATE POLICY "Admins can manage all evaluations"
ON public.candidate_evaluations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own visible evaluations"
ON public.candidate_evaluations FOR SELECT
USING (
    is_visible_to_candidate = true 
    AND EXISTS (
        SELECT 1 FROM public.applications a 
        WHERE a.id = candidate_evaluations.application_id 
        AND a.user_id = auth.uid()
    )
);

-- RLS Policies for evaluation_scores
CREATE POLICY "Admins can manage all evaluation_scores"
ON public.evaluation_scores FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own visible evaluation_scores"
ON public.evaluation_scores FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.candidate_evaluations ce
        JOIN public.applications a ON a.id = ce.application_id
        WHERE ce.id = evaluation_scores.evaluation_id
        AND ce.is_visible_to_candidate = true
        AND a.user_id = auth.uid()
    )
);

-- Create trigger for updated_at on candidate_evaluations
CREATE TRIGGER update_candidate_evaluations_updated_at
BEFORE UPDATE ON public.candidate_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint to ensure valid recommendation values
ALTER TABLE public.candidate_evaluations 
ADD CONSTRAINT valid_recommendation 
CHECK (recommendation IN ('pass', 'fail', 'hold'));

-- Add constraint to ensure valid mode values for job_rounds
ALTER TABLE public.job_rounds 
ADD CONSTRAINT valid_round_mode 
CHECK (mode IN ('online_aptitude', 'online_technical', 'in_person', 'interview', 'hr_round'));

-- Add constraint to ensure valid mode values for slots
ALTER TABLE public.slots 
ADD CONSTRAINT valid_slot_mode 
CHECK (mode IN ('online', 'in_person'));