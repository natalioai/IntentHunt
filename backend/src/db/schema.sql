-- clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  business_name TEXT,
  niche TEXT,
  keywords TEXT[] DEFAULT '{}',
  city TEXT,
  target_subreddits TEXT[] DEFAULT '{}',
  reddit_access_token TEXT,
  reddit_refresh_token TEXT,
  reddit_username TEXT,
  auto_dm_enabled BOOLEAN DEFAULT false,
  auto_dm_threshold INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  reddit_post_id TEXT NOT NULL,
  reddit_author TEXT,
  subreddit TEXT,
  post_title TEXT,
  post_text TEXT,
  post_url TEXT,
  audience_type TEXT CHECK (audience_type IN ('B2C', 'B2B', 'Noise')),
  intent_score INTEGER CHECK (intent_score >= 0 AND intent_score <= 100),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  matched_keyword TEXT,
  dm_sent BOOLEAN DEFAULT false,
  dm_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to avoid duplicate leads
CREATE UNIQUE INDEX IF NOT EXISTS leads_client_post_unique ON leads(client_id, reddit_post_id);

-- messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  reddit_author TEXT NOT NULL,
  message_subject TEXT,
  message_body TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_intent_score ON leads(intent_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
