-- Create job_tasks table for storing tasks that can be assigned to candidates
CREATE TABLE public.job_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  estimated_hours INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_assignments table for tracking which tasks are assigned to which candidates
CREATE TABLE public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.job_tasks(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  submission_url TEXT,
  submission_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  score INTEGER,
  UNIQUE(task_id, application_id)
);

-- Enable RLS
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_tasks
CREATE POLICY "Admins can manage job tasks"
  ON public.job_tasks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view active tasks for jobs they applied to"
  ON public.job_tasks FOR SELECT
  USING (
    is_active = true AND 
    EXISTS (
      SELECT 1 FROM public.applications 
      WHERE applications.job_id = job_tasks.job_id 
      AND applications.user_id = auth.uid()
    )
  );

-- RLS policies for task_assignments
CREATE POLICY "Admins can manage task assignments"
  ON public.task_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own task assignments"
  ON public.task_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications 
      WHERE applications.id = task_assignments.application_id 
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own task assignments"
  ON public.task_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.applications 
      WHERE applications.id = task_assignments.application_id 
      AND applications.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_job_tasks_updated_at
  BEFORE UPDATE ON public.job_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_job_tasks_job_id ON public.job_tasks(job_id);
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_application_id ON public.task_assignments(application_id);