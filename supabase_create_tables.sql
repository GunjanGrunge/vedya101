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

-- Freemium tracking columns (Story 1.1)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'freemium';
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_hours_used FLOAT DEFAULT 0.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subjects_accessed JSONB DEFAULT '[]';

-- Organisation tables (Stories 1.3 & 1.4)
-- Note: gen_random_uuid() requires pgcrypto extension (enabled by default in Supabase)
CREATE TABLE IF NOT EXISTS orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    admin_clerk_user_id VARCHAR(255) NOT NULL,
    seat_count INTEGER NOT NULL DEFAULT 1,
    product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('corporate', 'vocational')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    clerk_user_id VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'member')),
    invited_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orgs_admin_clerk_user_id ON orgs(admin_clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_clerk_user_id ON org_members(clerk_user_id);

-- Story 3.1: School AI Syllabus Generation — board/grade columns on learning_plans
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS board VARCHAR(50);
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS grade INTEGER;

-- Story 3.2: Exam Prep Syllabus Generation — exam_type column on learning_plans
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS exam_type VARCHAR(20);

-- Story 3.3: Org Content Upload Pipeline — org_content table
CREATE TABLE IF NOT EXISTS org_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  clerk_user_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  s3_key VARCHAR(1000) NOT NULL,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('pdf','video','sop','manual','docx','txt')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected')),
  file_size_bytes BIGINT,
  teaching_plan_id UUID REFERENCES learning_plans(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_content_org_id ON org_content(org_id);
CREATE INDEX IF NOT EXISTS idx_org_content_status ON org_content(status);

-- Story 7.1: In-App Notification Infrastructure — notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR NOT NULL,
  type VARCHAR(50) NOT NULL,  -- 'progress' | 'reminder' | 'admin_alert' | 'moderation'
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_clerk_user_id ON notifications(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(clerk_user_id, read) WHERE read = false;

-- Story 7.2: Inactivity tracking — last_active_at column on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- ── Epic 5: Content Safety & Moderation Pipeline ──────────────────────────

-- Story 5.1: Age-Appropriate Content Filtering — app_settings seed
INSERT INTO app_settings (key, value)
VALUES ('content_filter_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Story 5.2: Org Content Automated Moderation — moderation metadata columns
ALTER TABLE org_content ADD COLUMN IF NOT EXISTS moderation_risk_level VARCHAR(20) DEFAULT 'pending';
ALTER TABLE org_content ADD COLUMN IF NOT EXISTS moderation_completed_at TIMESTAMPTZ;
ALTER TABLE org_content ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Story 5.3: HITL Review Workflow — review tracking columns
ALTER TABLE org_content ADD COLUMN IF NOT EXISTS content_review_notes TEXT;
ALTER TABLE org_content ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(255);
ALTER TABLE org_content ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Story 5.4: Tiered Provisional Publish — provisional_published flag
ALTER TABLE org_content ADD COLUMN IF NOT EXISTS provisional_published BOOLEAN DEFAULT false;

-- Story 5.3: Extend status check constraint to include new HITL statuses
-- Note: constraint alteration is not directly supported in all PG versions;
-- the application layer enforces the allowed status values.
-- Valid status values: pending, in_review, needs_clarification, approved, rejected
