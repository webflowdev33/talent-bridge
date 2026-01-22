-- Create violations table to track test proctoring violations
-- Users are allowed maximum 2 violations before test is auto-submitted
CREATE TABLE IF NOT EXISTS public.violations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_attempt_id uuid NOT NULL,
  user_id uuid NOT NULL,
  violation_type text NOT NULL,
  violation_count integer NULL DEFAULT 1,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT violations_pkey PRIMARY KEY (id),
  CONSTRAINT violations_test_attempt_id_fkey FOREIGN KEY (test_attempt_id) 
    REFERENCES public.test_attempts (id) ON DELETE CASCADE,
  CONSTRAINT violations_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT violations_violation_type_check CHECK (
    violation_type = ANY (
      ARRAY[
        'tab_switch'::text,
        'window_blur'::text,
        'copy_paste'::text,
        'right_click'::text,
        'fullscreen_exit'::text,
        'keyboard_shortcut'::text,
        'keyboard_restricted'::text,
        'devtools_attempt'::text,
        'window_close_attempt'::text,
        'refresh_attempt'::text
      ]
    )
  )
) TABLESPACE pg_default;

-- Add comment for documentation
COMMENT ON TABLE public.violations IS 'Tracks proctoring violations during test attempts. Users are allowed maximum 2 violations before auto-submission. Keyboard is disabled after entering fullscreen.';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS violations_test_attempt_id_idx ON public.violations (test_attempt_id);
CREATE INDEX IF NOT EXISTS violations_user_id_idx ON public.violations (user_id);
CREATE INDEX IF NOT EXISTS violations_created_at_idx ON public.violations (created_at);
