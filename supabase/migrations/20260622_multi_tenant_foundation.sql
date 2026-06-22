-- Multi-tenant foundation: tie call_sessions to users and enable
-- incoming-call → user resolution via twilio_phone_number.

-- 1. call_sessions: add user_id column (nullable so existing rows survive)
ALTER TABLE call_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id
  ON call_sessions(user_id);

-- 2. user_settings: add twilio_phone_number for incoming-call routing
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;

CREATE INDEX IF NOT EXISTS idx_user_settings_twilio_phone
  ON user_settings(twilio_phone_number);

-- 3. RLS on call_sessions (anon-key queries from the dashboard)
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY call_sessions_select_own ON call_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY call_sessions_delete_own ON call_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY call_sessions_insert_service ON call_sessions
  FOR INSERT WITH CHECK (true);
