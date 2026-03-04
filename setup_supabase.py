#!/usr/bin/env python3
"""
Supabase Database Setup Script
This script sets up the necessary database schema and extensions for VEDYA.
"""

import os
import asyncio
import asyncpg
from urllib.parse import urlparse, urlunparse, quote
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def _normalize_database_url(url: str) -> str:
    """Encode password so special characters like @ don't break the URL."""
    if not url or not url.startswith("postgresql://"):
        return url
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc
        if "@" not in netloc:
            return url
        userinfo, hostport = netloc.rsplit("@", 1)
        if ":" in userinfo:
            user, _, password = userinfo.partition(":")
            if password and any(c in password for c in "@:/?#[]"):
                safe_password = quote(password, safe="")
                safe_netloc = f"{user}:{safe_password}@{hostport}"
                return urlunparse((parsed.scheme, safe_netloc, parsed.path or "/", parsed.params, parsed.query, parsed.fragment))
    except Exception:
        pass
    return url


async def setup_supabase_database():
    """Set up Supabase database with required extensions and tables."""
    
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False

    database_url = _normalize_database_url(raw_url)
    
    try:
        # Connect to Supabase PostgreSQL
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to Supabase PostgreSQL successfully")
        
        # Enable required extensions
        print("🔧 Enabling required extensions...")
        
        # Enable pgvector extension for vector embeddings
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        print("✅ pgvector extension enabled")
        
        # Enable uuid extension for UUID generation
        await conn.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
        print("✅ uuid-ossp extension enabled")
        
        # Create core tables
        print("🗄️ Creating core database tables...")
        
        # Users table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email VARCHAR(255) UNIQUE NOT NULL,
                clerk_user_id VARCHAR(255) UNIQUE,
                name VARCHAR(255),
                preferences JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ Users table created")
        
        # User onboarding table (wizard data for new users)
        await conn.execute("""
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
            )
        """)
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id)")
        print("✅ User onboarding table created")
        
        # Learning plans table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS learning_plans (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                summary TEXT,
                goals JSONB DEFAULT '[]',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ Learning plans table created")
        await conn.execute("ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS plan_data JSONB DEFAULT '{}'")
        print("✅ learning_plans.plan_data column added")

        # App settings (e.g. configurable plan-ready message)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ App settings table created")

        # Courses table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                title VARCHAR(500) NOT NULL,
                description TEXT,
                content JSONB DEFAULT '{}',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ Courses table created")
        
        # Lessons table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS lessons (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                content TEXT,
                content_type VARCHAR(100) DEFAULT 'text',
                order_index INTEGER DEFAULT 0,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ Lessons table created")
        
        # Progress tracking table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
                completion_percentage DECIMAL(5,2) DEFAULT 0.00,
                time_spent_minutes INTEGER DEFAULT 0,
                last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ User progress table created")
        
        # Chat conversations table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_conversations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(500),
                context JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ Chat conversations table created")
        
        # Chat messages table with vector embeddings
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
                content TEXT NOT NULL,
                embedding vector(1536), -- OpenAI text-embedding-ada-002 dimensions (Supabase compatible)
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ Chat messages table created")
        
        # Agent runs table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_runs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                agent_name VARCHAR(255) NOT NULL,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                input_data JSONB,
                output_data JSONB,
                status VARCHAR(50) DEFAULT 'running',
                error_message TEXT,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                completed_at TIMESTAMP WITH TIME ZONE
            )
        """)
        print("✅ Agent runs table created")
        
        # Kanban tasks table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS kanban_tasks (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                plan_id UUID REFERENCES learning_plans(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, done, blocked
                priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
                assignee_agent VARCHAR(255),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✅ Kanban tasks table created")
        
        # Create indexes for better performance
        print("🚀 Creating database indexes...")
        
        # Vector similarity search index (use hnsw for better compatibility)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS chat_messages_embedding_idx 
            ON chat_messages USING hnsw (embedding vector_cosine_ops)
        """)
        print("✅ Vector search index created")
        
        # Regular indexes
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_progress_user_course ON user_progress(user_id, course_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_kanban_plan ON kanban_tasks(plan_id)")
        print("✅ Database indexes created")
        
        # Verify the setup
        print("\n🔍 Verifying database setup...")
        
        # Check if pgvector is working
        result = await conn.fetchval("SELECT '[1,2,3]'::vector")
        print(f"✅ pgvector working: {result}")
        
        # Check table count
        tables = await conn.fetch("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        print(f"✅ Created {len(tables)} tables")
        
        await conn.close()
        print("\n🎉 Supabase database setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Setting up VEDYA database on Supabase...")
    success = asyncio.run(setup_supabase_database())
    
    if success:
        print("\n✅ Database is ready for VEDYA agents!")
        print("Next steps:")
        print("1. Run 'python api_server.py' to start the backend")
        print("2. Run 'cd frontend && npm run dev' to start the frontend")
    else:
        print("\n❌ Database setup failed. Please check your configuration.")
