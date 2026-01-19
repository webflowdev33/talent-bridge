-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    zip_code TEXT,
    resume_url TEXT,
    profile_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create jobs table
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    department TEXT,
    location TEXT,
    salary_range TEXT,
    total_rounds INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create slots table
CREATE TABLE public.slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 50,
    current_capacity INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create applications table
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    slot_id UUID REFERENCES public.slots(id),
    current_round INTEGER DEFAULT 1,
    status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'slot_selected', 'approved', 'test_enabled', 'test_taken', 'passed', 'failed', 'next_round', 'selected', 'rejected')),
    admin_approved BOOLEAN DEFAULT false,
    test_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, job_id)
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    round_number INTEGER DEFAULT 1,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    marks INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test_attempts table
CREATE TABLE public.test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    round_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 60,
    total_marks INTEGER DEFAULT 0,
    obtained_marks INTEGER DEFAULT 0,
    passing_marks INTEGER DEFAULT 0,
    is_passed BOOLEAN,
    is_submitted BOOLEAN DEFAULT false,
    auto_submitted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create answers table
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    selected_answer TEXT CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tokens table (for admin-assigned test access)
CREATE TABLE public.tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    token_value TEXT NOT NULL UNIQUE,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create violations table
CREATE TABLE public.violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL CHECK (violation_type IN ('tab_switch', 'window_blur', 'copy_paste', 'right_click', 'fullscreen_exit')),
    violation_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Jobs policies (public read, admin write)
CREATE POLICY "Anyone can view active jobs" ON public.jobs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage jobs" ON public.jobs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Slots policies
CREATE POLICY "Users can view enabled slots" ON public.slots FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins can manage slots" ON public.slots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Applications policies
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all applications" ON public.applications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Questions policies (only visible during active test, or to admin)
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view questions during test" ON public.questions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.applications a 
        WHERE a.user_id = auth.uid() 
        AND a.job_id = questions.job_id 
        AND a.test_enabled = true
    )
);

-- Test attempts policies
CREATE POLICY "Users can view own test attempts" ON public.test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own test attempts" ON public.test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own test attempts" ON public.test_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all test attempts" ON public.test_attempts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Answers policies
CREATE POLICY "Users can manage own answers" ON public.answers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.test_attempts t WHERE t.id = answers.test_attempt_id AND t.user_id = auth.uid())
);
CREATE POLICY "Admins can view all answers" ON public.answers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Tokens policies
CREATE POLICY "Users can view own tokens" ON public.tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage tokens" ON public.tokens FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Violations policies
CREATE POLICY "Users can manage own violations" ON public.violations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all violations" ON public.violations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile and assign default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies for resumes
CREATE POLICY "Users can upload own resume" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own resume" ON storage.objects FOR SELECT
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own resume" ON storage.objects FOR UPDATE
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all resumes" ON storage.objects FOR SELECT
    USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'admin'));