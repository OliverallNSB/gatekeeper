ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS business_name TEXT;
