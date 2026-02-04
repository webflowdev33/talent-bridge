-- Create template_rounds table for storing rounds in job templates
CREATE TABLE public.template_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.job_templates(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  mode TEXT DEFAULT 'online_aptitude',
  description TEXT,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_rounds ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage template_rounds"
ON public.template_rounds
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view template_rounds for active templates"
ON public.template_rounds
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM job_templates
  WHERE job_templates.id = template_rounds.template_id
  AND job_templates.is_active = true
));

-- Create index for performance
CREATE INDEX idx_template_rounds_template_id ON public.template_rounds(template_id);