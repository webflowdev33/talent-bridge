-- Make job_id nullable in slots table so slots can be universal
ALTER TABLE public.slots ALTER COLUMN job_id DROP NOT NULL;