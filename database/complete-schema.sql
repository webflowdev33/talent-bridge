-- =====================================================
-- HIRING PLATFORM - COMPLETE DATABASE SCHEMA
-- =====================================================
-- Run this file in Supabase SQL Editor to set up the entire database
-- Make sure to run this on a fresh database or handle existing objects
-- =====================================================

-- =====================================================
-- STEP 1: ENUMS
-- =====================================================

-- Create app_role enum for user roles
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- STEP 2: HELPER FUNCTIONS
-- =====================================================

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 3: CORE TABLES
-- =====================================================

-- User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email text,
    full_name text,
    phone text,
    date_of_birth date,
    address text,
    city text,
    state text,
    country text,
    zip_code text,
    avatar_url text,
    resume_url text,
    skills text[] DEFAULT '{}'::text[],
    education jsonb DEFAULT '[]'::jsonb,
    experience jsonb DEFAULT '[]'::jsonb,
    profile_completed boolean DEFAULT false,
    guide_acknowledged boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Job Templates Table
CREATE TABLE IF NOT EXISTS public.job_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    department text,
    location text,
    salary_range text,
    requirements text,
    question_count integer DEFAULT 10,
    test_time_minutes integer DEFAULT 15,
    total_rounds integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Template Rounds Table
CREATE TABLE IF NOT EXISTS public.template_rounds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES public.job_templates(id) ON DELETE CASCADE,
    round_number integer NOT NULL DEFAULT 1,
    name text NOT NULL,
    mode text DEFAULT 'online_aptitude',
    description text,
    instructions text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Jobs Table
CREATE TABLE IF NOT EXISTS public.jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    department text,
    location text,
    salary_range text,
    requirements text,
    question_count integer DEFAULT 10,
    test_time_minutes integer DEFAULT 15,
    total_rounds integer DEFAULT 1,
    is_active boolean DEFAULT true,
    template_id uuid REFERENCES public.job_templates(id) ON DELETE SET NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Job Rounds Table
CREATE TABLE IF NOT EXISTS public.job_rounds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    round_number integer NOT NULL DEFAULT 1,
    name text NOT NULL,
    mode text DEFAULT 'online_aptitude',
    description text,
    instructions text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Slots Table
CREATE TABLE IF NOT EXISTS public.slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    slot_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    max_capacity integer DEFAULT 50,
    current_capacity integer DEFAULT 0,
    round_number integer,
    mode text DEFAULT 'online',
    venue text,
    is_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    slot_id uuid REFERENCES public.slots(id) ON DELETE SET NULL,
    status text DEFAULT 'applied',
    current_round integer DEFAULT 1,
    admin_approved boolean DEFAULT false,
    test_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    round_number integer DEFAULT 1,
    question_text text NOT NULL,
    option_a text NOT NULL,
    option_b text NOT NULL,
    option_c text,
    option_d text,
    correct_answer text NOT NULL,
    marks integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

-- Test Attempts Table
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    round_number integer DEFAULT 1,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    duration_minutes integer DEFAULT 60,
    total_marks integer DEFAULT 0,
    obtained_marks integer DEFAULT 0,
    passing_marks integer DEFAULT 0,
    is_passed boolean,
    is_submitted boolean DEFAULT false,
    auto_submitted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Answers Table
CREATE TABLE IF NOT EXISTS public.answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_answer text,
    is_correct boolean,
    created_at timestamp with time zone DEFAULT now()
);

-- Violations Table
CREATE TABLE IF NOT EXISTS public.violations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    violation_type text NOT NULL,
    violation_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

-- Tokens Table
CREATE TABLE IF NOT EXISTS public.tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    token_value text NOT NULL,
    is_used boolean DEFAULT false,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Evaluation Parameters Table
CREATE TABLE IF NOT EXISTS public.evaluation_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    max_score integer NOT NULL DEFAULT 10,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Candidate Evaluations Table
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

-- Evaluation Scores Table
CREATE TABLE IF NOT EXISTS public.evaluation_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id uuid NOT NULL REFERENCES public.candidate_evaluations(id) ON DELETE CASCADE,
    parameter_id uuid NOT NULL REFERENCES public.evaluation_parameters(id) ON DELETE CASCADE,
    score integer NOT NULL DEFAULT 0,
    remarks text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Job Tasks Table
CREATE TABLE IF NOT EXISTS public.job_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    instructions text,
    estimated_hours integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Task Assignments Table
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.job_tasks(id) ON DELETE CASCADE,
    application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    status text DEFAULT 'pending',
    due_date timestamp with time zone,
    submission_url text,
    submission_notes text,
    submitted_at timestamp with time zone,
    score integer,
    reviewer_notes text,
    reviewed_at timestamp with time zone,
    assigned_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- STEP 4: TRIGGERS
-- =====================================================

-- Handle new user registration - creates profile and assigns role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers for tables that need them
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_templates_updated_at ON public.job_templates;
CREATE TRIGGER update_job_templates_updated_at
    BEFORE UPDATE ON public.job_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidate_evaluations_updated_at ON public.candidate_evaluations;
CREATE TRIGGER update_candidate_evaluations_updated_at
    BEFORE UPDATE ON public.candidate_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_tasks_updated_at ON public.job_tasks;
CREATE TRIGGER update_job_tasks_updated_at
    BEFORE UPDATE ON public.job_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- ============ USER ROLES POLICIES ============
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- ============ PROFILES POLICIES ============
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ============ CAMPAIGNS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage campaigns" ON public.campaigns
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
    FOR SELECT USING (is_active = true);

-- ============ JOB TEMPLATES POLICIES ============
DROP POLICY IF EXISTS "Admins can manage job_templates" ON public.job_templates;
CREATE POLICY "Admins can manage job_templates" ON public.job_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view active job_templates" ON public.job_templates;
CREATE POLICY "Anyone can view active job_templates" ON public.job_templates
    FOR SELECT USING (is_active = true);

-- ============ TEMPLATE ROUNDS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage template_rounds" ON public.template_rounds;
CREATE POLICY "Admins can manage template_rounds" ON public.template_rounds
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view template_rounds for active templates" ON public.template_rounds;
CREATE POLICY "Anyone can view template_rounds for active templates" ON public.template_rounds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_templates
            WHERE job_templates.id = template_rounds.template_id
            AND job_templates.is_active = true
        )
    );

-- ============ JOBS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
CREATE POLICY "Admins can manage jobs" ON public.jobs
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
CREATE POLICY "Anyone can view active jobs" ON public.jobs
    FOR SELECT USING (is_active = true);

-- ============ JOB ROUNDS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage job_rounds" ON public.job_rounds;
CREATE POLICY "Admins can manage job_rounds" ON public.job_rounds
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view job_rounds for active jobs" ON public.job_rounds;
CREATE POLICY "Anyone can view job_rounds for active jobs" ON public.job_rounds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_rounds.job_id
            AND jobs.is_active = true
        )
    );

-- ============ SLOTS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage slots" ON public.slots;
CREATE POLICY "Admins can manage slots" ON public.slots
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view enabled slots" ON public.slots;
CREATE POLICY "Users can view enabled slots" ON public.slots
    FOR SELECT USING (is_enabled = true);

-- ============ APPLICATIONS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage all applications" ON public.applications;
CREATE POLICY "Admins can manage all applications" ON public.applications
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
CREATE POLICY "Users can view own applications" ON public.applications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own applications" ON public.applications;
CREATE POLICY "Users can create own applications" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
CREATE POLICY "Users can update own applications" ON public.applications
    FOR UPDATE USING (auth.uid() = user_id);

-- ============ QUESTIONS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view questions during test" ON public.questions;
CREATE POLICY "Users can view questions during test" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications a
            WHERE a.user_id = auth.uid()
            AND a.job_id = questions.job_id
            AND a.test_enabled = true
        )
    );

-- ============ TEST ATTEMPTS POLICIES ============
DROP POLICY IF EXISTS "Admins can view all test attempts" ON public.test_attempts;
CREATE POLICY "Admins can view all test attempts" ON public.test_attempts
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own test attempts" ON public.test_attempts;
CREATE POLICY "Users can view own test attempts" ON public.test_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own test attempts" ON public.test_attempts;
CREATE POLICY "Users can create own test attempts" ON public.test_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own test attempts" ON public.test_attempts;
CREATE POLICY "Users can update own test attempts" ON public.test_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- ============ ANSWERS POLICIES ============
DROP POLICY IF EXISTS "Admins can view all answers" ON public.answers;
CREATE POLICY "Admins can view all answers" ON public.answers
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can manage own answers" ON public.answers;
CREATE POLICY "Users can manage own answers" ON public.answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM test_attempts t
            WHERE t.id = answers.test_attempt_id
            AND t.user_id = auth.uid()
        )
    );

-- ============ VIOLATIONS POLICIES ============
DROP POLICY IF EXISTS "Admins can view all violations" ON public.violations;
CREATE POLICY "Admins can view all violations" ON public.violations
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can manage own violations" ON public.violations;
CREATE POLICY "Users can manage own violations" ON public.violations
    FOR ALL USING (auth.uid() = user_id);

-- ============ TOKENS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage tokens" ON public.tokens;
CREATE POLICY "Admins can manage tokens" ON public.tokens
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own tokens" ON public.tokens;
CREATE POLICY "Users can view own tokens" ON public.tokens
    FOR SELECT USING (auth.uid() = user_id);

-- ============ EVALUATION PARAMETERS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage evaluation_parameters" ON public.evaluation_parameters;
CREATE POLICY "Admins can manage evaluation_parameters" ON public.evaluation_parameters
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view active evaluation_parameters" ON public.evaluation_parameters;
CREATE POLICY "Anyone can view active evaluation_parameters" ON public.evaluation_parameters
    FOR SELECT USING (is_active = true);

-- ============ CANDIDATE EVALUATIONS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage all evaluations" ON public.candidate_evaluations;
CREATE POLICY "Admins can manage all evaluations" ON public.candidate_evaluations
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own visible evaluations" ON public.candidate_evaluations;
CREATE POLICY "Users can view their own visible evaluations" ON public.candidate_evaluations
    FOR SELECT USING (
        is_visible_to_candidate = true
        AND EXISTS (
            SELECT 1 FROM applications a
            WHERE a.id = candidate_evaluations.application_id
            AND a.user_id = auth.uid()
        )
    );

-- ============ EVALUATION SCORES POLICIES ============
DROP POLICY IF EXISTS "Admins can manage all evaluation_scores" ON public.evaluation_scores;
CREATE POLICY "Admins can manage all evaluation_scores" ON public.evaluation_scores
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own visible evaluation_scores" ON public.evaluation_scores;
CREATE POLICY "Users can view their own visible evaluation_scores" ON public.evaluation_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM candidate_evaluations ce
            JOIN applications a ON a.id = ce.application_id
            WHERE ce.id = evaluation_scores.evaluation_id
            AND ce.is_visible_to_candidate = true
            AND a.user_id = auth.uid()
        )
    );

-- ============ JOB TASKS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage job tasks" ON public.job_tasks;
CREATE POLICY "Admins can manage job tasks" ON public.job_tasks
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view active tasks for jobs they applied to" ON public.job_tasks;
CREATE POLICY "Users can view active tasks for jobs they applied to" ON public.job_tasks
    FOR SELECT USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM applications
            WHERE applications.job_id = job_tasks.job_id
            AND applications.user_id = auth.uid()
        )
    );

-- ============ TASK ASSIGNMENTS POLICIES ============
DROP POLICY IF EXISTS "Admins can manage task assignments" ON public.task_assignments;
CREATE POLICY "Admins can manage task assignments" ON public.task_assignments
    FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own task assignments" ON public.task_assignments;
CREATE POLICY "Users can view their own task assignments" ON public.task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications
            WHERE applications.id = task_assignments.application_id
            AND applications.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own task assignments" ON public.task_assignments;
CREATE POLICY "Users can update their own task assignments" ON public.task_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM applications
            WHERE applications.id = task_assignments.application_id
            AND applications.user_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 7: STORAGE BUCKETS
-- =====================================================

-- Create resumes bucket (run this separately if bucket already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resumes bucket
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;
CREATE POLICY "Users can upload own resume" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view own resume" ON storage.objects;
CREATE POLICY "Users can view own resume" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resumes' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
CREATE POLICY "Users can update own resume" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'resumes' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;
CREATE POLICY "Users can delete own resume" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resumes' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Admins can view all resumes" ON storage.objects;
CREATE POLICY "Admins can view all resumes" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resumes' 
        AND has_role(auth.uid(), 'admin')
    );

-- =====================================================
-- STEP 8: INDEXES FOR PERFORMANCE
-- =====================================================

-- Add campaign_id to slots if it doesn't exist (for existing databases)
DO $$ BEGIN
    ALTER TABLE public.slots ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add campaign_id to jobs if it doesn't exist (for existing databases)
DO $$ BEGIN
    ALTER TABLE public.jobs ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_application_id ON public.test_attempts(application_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_job_id ON public.questions(job_id);
CREATE INDEX IF NOT EXISTS idx_answers_test_attempt_id ON public.answers(test_attempt_id);
CREATE INDEX IF NOT EXISTS idx_job_rounds_job_id ON public.job_rounds(job_id);
CREATE INDEX IF NOT EXISTS idx_template_rounds_template_id ON public.template_rounds(template_id);
CREATE INDEX IF NOT EXISTS idx_slots_job_id ON public.slots(job_id);
CREATE INDEX IF NOT EXISTS idx_slots_campaign_id ON public.slots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_jobs_campaign_id ON public.jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_jobs_template_id ON public.jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_candidate_evaluations_application_id ON public.candidate_evaluations(application_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation_id ON public.evaluation_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_application_id ON public.task_assignments(application_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON public.job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_violations_test_attempt_id ON public.violations(test_attempt_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- =====================================================
-- DONE!
-- =====================================================
-- After running this script:
-- 1. Create your first admin user through Supabase Auth
-- 2. Manually update their role in user_roles table:
--    UPDATE public.user_roles SET role = 'admin' WHERE user_id = '<admin-user-uuid>';
-- =====================================================
