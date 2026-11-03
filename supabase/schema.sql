
-- GarmentAI Inspector Database Schema
-- Inspections table security configuration

-- Add user relationship
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS user_id uuid
REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add review timestamp
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Allow optional review comments
ALTER TABLE public.inspections
ALTER COLUMN review_comment DROP NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.inspections
ENABLE ROW LEVEL SECURITY;

-- Recreate user-specific read policy
DROP POLICY IF EXISTS "Users can read their inspections"
ON public.inspections;

CREATE POLICY "Users can read their inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add index for inspection history
CREATE INDEX IF NOT EXISTS inspections_user_created_idx
ON public.inspections (user_id, created_at DESC);
