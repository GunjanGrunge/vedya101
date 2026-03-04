-- Run this in Supabase Dashboard: SQL Editor → New query → paste and Run
-- Creates users and user_onboarding tables required for onboarding and auth.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  clerk_user_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  full_name VARCHAR(255),
  address TEXT,
  gender VARCHAR(50),
  country VARCHAR(255),
  age INTEGER,
  languages_to_learn JSONB DEFAULT '[]',
  educational_status VARCHAR(255),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- Learning plans (courses created from AI chat)
CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  goals JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS plan_data JSONB DEFAULT '{}';
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON learning_plans(user_id);

-- App settings (e.g. plan-ready message). Run if using learning plan + dashboard config.
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
