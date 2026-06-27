ALTER TABLE call_sessions
  ADD COLUMN IF NOT EXISTS call_category TEXT;
