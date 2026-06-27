CREATE TABLE IF NOT EXISTS lead_intake (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  caller_name TEXT,
  service_needed TEXT,
  property_address TEXT,
  callback_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_intake_user_id ON lead_intake(user_id);

ALTER TABLE lead_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_intake_select_own ON lead_intake
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY lead_intake_insert_service ON lead_intake
  FOR INSERT WITH CHECK (true);
