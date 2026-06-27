ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS assistant_name TEXT DEFAULT 'Sarah';
