CREATE TABLE IF NOT EXISTS user_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_suggestions" ON user_suggestions
  FOR ALL USING ((select auth.uid()) = user_id);
