-- RLS policies for file_attachments table
-- Fixes: "new row violates row-level security policy"

ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "file_attachments_select"  ON public.file_attachments;
DROP POLICY IF EXISTS "file_attachments_insert"  ON public.file_attachments;
DROP POLICY IF EXISTS "file_attachments_update"  ON public.file_attachments;
DROP POLICY IF EXISTS "file_attachments_delete"  ON public.file_attachments;

-- Authenticated users can manage their own attachments (owner_id = auth.uid())
CREATE POLICY "file_attachments_select" ON public.file_attachments
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "file_attachments_insert" ON public.file_attachments
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "file_attachments_update" ON public.file_attachments
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "file_attachments_delete" ON public.file_attachments
  FOR DELETE USING (owner_id = auth.uid());
