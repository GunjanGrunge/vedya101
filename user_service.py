#!/usr/bin/env python3
"""
User Service - Clerk Integration with Database and Email Notifications
This service handles user registration, profile management, and email notifications.
"""

import os
import asyncio
import asyncpg
import logging
import json
from typing import Optional, Dict, Any
from urllib.parse import urlparse, urlunparse, quote
from dotenv import load_dotenv
from email_service import VedyaEmailService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _normalize_database_url(url: str) -> str:
    """
    Normalize DATABASE_URL so passwords containing @, :, or / are correctly encoded.
    Otherwise the URL parser can misidentify the host, causing 'nodename nor servname' errors.
    """
    if not url or not url.startswith("postgresql://"):
        return url
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc
        if "@" not in netloc:
            return url
        # Rightmost @ separates user:password from host:port
        userinfo, hostport = netloc.rsplit("@", 1)
        if ":" in userinfo:
            user, _, password = userinfo.partition(":")
            if password and any(c in password for c in "@:/?#[]"):
                safe_password = quote(password, safe="")
                safe_netloc = f"{user}:{safe_password}@{hostport}"
                return urlunparse((parsed.scheme, safe_netloc, parsed.path or "/", parsed.params, parsed.query, parsed.fragment))
    except Exception as e:
        logger.warning(f"Could not normalize DATABASE_URL: {e}")
    return url


class UserService:
    """Service for managing users, Clerk integration, and email notifications."""
    
    def __init__(self):
        raw_url = os.getenv("DATABASE_URL")
        self.database_url = _normalize_database_url(raw_url) if raw_url else None
        self.email_service = VedyaEmailService()
        
        if not self.database_url:
            raise ValueError("DATABASE_URL not found in environment variables")
    
    async def get_db_connection(self):
        """Get database connection with Supabase-compatible settings."""
        return await asyncpg.connect(self.database_url, statement_cache_size=0)
    
    async def create_user_from_clerk(self, clerk_user_id: str, email: str, name: str = None) -> Dict[str, Any]:
        """
        Create a new user from Clerk authentication data.
        This should be called when a user signs up via Clerk.
        """
        try:
            conn = await self.get_db_connection()
            
            # Check if user already exists
            existing_user = await conn.fetchrow(
                "SELECT * FROM users WHERE clerk_user_id = $1 OR email = $2",
                clerk_user_id, email
            )
            
            if existing_user:
                logger.info(f"User already exists: {email}")
                await conn.close()
                return {
                    "success": True,
                    "user_id": str(existing_user["id"]),
                    "message": "User already exists"
                }
            
            # Create new user
            user_id = await conn.fetchval("""
                INSERT INTO users (clerk_user_id, email, name, preferences)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            """, clerk_user_id, email, name, json.dumps({}))
            
            await conn.close()
            
            # Send welcome email
            try:
                await self.email_service.send_welcome_email(email, name or "Learner")
                logger.info(f"Welcome email sent to {email}")
            except Exception as e:
                logger.error(f"Failed to send welcome email to {email}: {str(e)}")
            
            logger.info(f"New user created: {email} (ID: {user_id})")
            
            return {
                "success": True,
                "user_id": str(user_id),
                "message": "User created successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to create user from Clerk: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_user_by_clerk_id(self, clerk_user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Clerk user ID. Prefer onboarding full_name as name when present."""
        try:
            conn = await self.get_db_connection()
            
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE clerk_user_id = $1",
                clerk_user_id
            )
            if not user:
                await conn.close()
                return None

            row = dict(user)
            onboarding = await conn.fetchrow(
                "SELECT full_name FROM user_onboarding WHERE user_id = $1",
                user["id"]
            )
            await conn.close()
            if onboarding and (onboarding.get("full_name") or "").strip():
                row["name"] = (onboarding["full_name"] or "").strip()
            return row
            
        except Exception as e:
            logger.error(f"Failed to get user by Clerk ID: {str(e)}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address."""
        try:
            conn = await self.get_db_connection()
            
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1",
                email
            )
            
            await conn.close()
            
            if user:
                return dict(user)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user by email: {str(e)}")
            return None
    
    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Update user preferences."""
        try:
            conn = await self.get_db_connection()
            
            await conn.execute("""
                UPDATE users 
                SET preferences = $1, updated_at = NOW()
                WHERE id = $2
            """, json.dumps(preferences), user_id)
            
            await conn.close()
            
            logger.info(f"Updated preferences for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user preferences: {str(e)}")
            return False
    
    async def send_learning_plan_notification(self, user_id: str, plan_details: Dict[str, Any]) -> bool:
        """Send learning plan ready notification to user."""
        try:
            # Get user info
            conn = await self.get_db_connection()
            user = await conn.fetchrow("SELECT email, name FROM users WHERE id = $1", user_id)
            await conn.close()
            
            if not user:
                logger.error(f"User not found: {user_id}")
                return False
            
            # Send email notification
            await self.email_service.send_learning_plan_ready(
                user["email"], 
                user["name"] or "Learner",
                plan_details.get("title", "Your Learning Plan"),
                plan_details.get("summary", "Your personalized learning plan is ready!")
            )
            
            logger.info(f"Learning plan notification sent to {user['email']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send learning plan notification: {str(e)}")
            return False
    
    async def send_progress_milestone_notification(self, user_id: str, milestone_data: Dict[str, Any]) -> bool:
        """Send progress milestone notification to user."""
        try:
            # Get user info
            conn = await self.get_db_connection()
            user = await conn.fetchrow("SELECT email, name FROM users WHERE id = $1", user_id)
            await conn.close()
            
            if not user:
                logger.error(f"User not found: {user_id}")
                return False
            
            # Send email notification
            await self.email_service.send_progress_milestone(
                user["email"],
                user["name"] or "Learner", 
                milestone_data.get("milestone", "Milestone Completed"),
                milestone_data.get("progress", 0)
            )
            
            logger.info(f"Milestone notification sent to {user['email']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send milestone notification: {str(e)}")
            return False
    
    async def send_daily_summary_notification(self, user_id: str, summary_data: Dict[str, Any]) -> bool:
        """Send daily summary notification to user."""
        try:
            # Get user info
            conn = await self.get_db_connection()
            user = await conn.fetchrow("SELECT email, name FROM users WHERE id = $1", user_id)
            await conn.close()
            
            if not user:
                logger.error(f"User not found: {user_id}")
                return False
            
            # Send email notification
            await self.email_service.send_daily_summary(
                user["email"],
                user["name"] or "Learner",
                summary_data
            )
            
            logger.info(f"Daily summary sent to {user['email']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send daily summary: {str(e)}")
            return False
    
    async def send_weekly_report_notification(self, user_id: str, report_data: Dict[str, Any]) -> bool:
        """Send weekly report notification to user."""
        try:
            # Get user info
            conn = await self.get_db_connection()
            user = await conn.fetchrow("SELECT email, name FROM users WHERE id = $1", user_id)
            await conn.close()
            
            if not user:
                logger.error(f"User not found: {user_id}")
                return False
            
            # Send email notification
            await self.email_service.send_weekly_report(
                user["email"],
                user["name"] or "Learner",
                report_data
            )
            
            logger.info(f"Weekly report sent to {user['email']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send weekly report: {str(e)}")
            return False
    
    async def get_onboarding_status(self, clerk_user_id: str) -> Dict[str, Any]:
        """Check if user has completed onboarding. Returns { completed: bool, data?: ... }."""
        try:
            conn = await self.get_db_connection()
            user = await conn.fetchrow("SELECT id FROM users WHERE clerk_user_id = $1", clerk_user_id)
            if not user:
                await conn.close()
                return {"completed": False}
            row = await conn.fetchrow(
                "SELECT * FROM user_onboarding WHERE user_id = $1",
                user["id"]
            )
            await conn.close()
            if not row:
                return {"completed": False}
            return {
                "completed": True,
                "data": {
                    "full_name": row.get("full_name"),
                    "country": row.get("country"),
                    "educational_status": row.get("educational_status"),
                }
            }
        except Exception as e:
            logger.error(f"Failed to get onboarding status: {str(e)}")
            return {"completed": False}

    async def get_onboarding_data(self, clerk_user_id: str) -> Optional[Dict[str, Any]]:
        """Get full onboarding record for the user (for settings/edit)."""
        try:
            conn = await self.get_db_connection()
            user = await conn.fetchrow("SELECT id FROM users WHERE clerk_user_id = $1", clerk_user_id)
            if not user:
                await conn.close()
                return None
            row = await conn.fetchrow(
                "SELECT full_name, address, gender, country, age, languages_to_learn, educational_status FROM user_onboarding WHERE user_id = $1",
                user["id"]
            )
            await conn.close()
            if not row:
                return None
            data = dict(row)
            if isinstance(data.get("languages_to_learn"), str):
                try:
                    data["languages_to_learn"] = json.loads(data["languages_to_learn"])
                except Exception:
                    data["languages_to_learn"] = []
            if data.get("languages_to_learn") is None:
                data["languages_to_learn"] = []
            return data
        except Exception as e:
            logger.error(f"Failed to get onboarding data: {str(e)}")
            return None

    async def save_onboarding(self, clerk_user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save onboarding data. Creates user if not exists, then upserts onboarding.
        data: full_name, address, gender, country, age, languages_to_learn (list), educational_status
        """
        try:
            conn = await self.get_db_connection()
            user = await conn.fetchrow("SELECT id FROM users WHERE clerk_user_id = $1", clerk_user_id)
            if not user:
                await conn.close()
                return {"success": False, "error": "User not found. Please complete sign-in first."}
            user_id = user["id"]
            languages = data.get("languages_to_learn") or []
            if isinstance(languages, str):
                try:
                    languages = json.loads(languages)
                except Exception:
                    languages = [languages]
            if not isinstance(languages, list):
                languages = []
            languages_json = json.dumps(languages)
            await conn.execute("""
                INSERT INTO user_onboarding (
                    user_id, full_name, address, gender, country, age,
                    languages_to_learn, educational_status, completed_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW(), NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    address = EXCLUDED.address,
                    gender = EXCLUDED.gender,
                    country = EXCLUDED.country,
                    age = EXCLUDED.age,
                    languages_to_learn = EXCLUDED.languages_to_learn,
                    educational_status = EXCLUDED.educational_status,
                    completed_at = NOW(),
                    updated_at = NOW()
            """,
                user_id,
                data.get("full_name") or "",
                data.get("address") or "",
                data.get("gender") or "",
                data.get("country") or "",
                int(data.get("age")) if data.get("age") is not None and str(data.get("age")).strip() != "" else None,
                languages_json,
                data.get("educational_status") or ""
            )
            full_name = (data.get("full_name") or "").strip()
            if full_name:
                await conn.execute(
                    "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2",
                    full_name,
                    user_id,
                )
            await conn.close()
            logger.info(f"Onboarding saved for user {user_id}")
            return {"success": True}
        except Exception as e:
            logger.error(f"Failed to save onboarding: {str(e)}")
            return {"success": False, "error": str(e)}

    async def create_chat_conversation(self, clerk_user_id: str) -> Optional[str]:
        """Create a chat conversation for the user. Returns conversation id (session_id) or None."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                logger.warning("create_chat_conversation: user not found for clerk_user_id")
                return None
            user_id = user["id"]
            conn = await self.get_db_connection()
            conversation_id = await conn.fetchval(
                """
                INSERT INTO chat_conversations (user_id)
                VALUES ($1)
                RETURNING id
                """,
                user_id,
            )
            await conn.close()
            return str(conversation_id) if conversation_id else None
        except Exception as e:
            logger.error(f"Failed to create chat conversation: {e}")
            return None

    async def save_chat_message(self, conversation_id: str, role: str, content: str) -> bool:
        """Save a chat message (user or assistant) with timestamp. Returns True on success."""
        try:
            conn = await self.get_db_connection()
            await conn.execute(
                """
                INSERT INTO chat_messages (conversation_id, role, content)
                VALUES ($1::uuid, $2, $3)
                """,
                conversation_id,
                role,
                content,
            )
            await conn.execute(
                "UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1::uuid",
                conversation_id,
            )
            await conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to save chat message: {e}")
            return False

    async def list_chat_conversations(self, clerk_user_id: str) -> list:
        """List chat conversations that have at least one message, most recent first. Returns id, created_at, updated_at, topic (first user message truncated, or first message)."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                return []
            conn = await self.get_db_connection()
            rows = await conn.fetch(
                """
                SELECT c.id, c.created_at, c.updated_at,
                  COALESCE(
                    (SELECT LEFT(TRIM(m.content), 56) FROM chat_messages m
                     WHERE m.conversation_id = c.id AND m.role = 'user'
                     ORDER BY m.created_at ASC LIMIT 1),
                    (SELECT LEFT(TRIM(m.content), 56) FROM chat_messages m
                     WHERE m.conversation_id = c.id
                     ORDER BY m.created_at ASC LIMIT 1)
                  ) AS topic
                FROM chat_conversations c
                WHERE c.user_id = $1
                  AND EXISTS (SELECT 1 FROM chat_messages m WHERE m.conversation_id = c.id AND m.role = 'user')
                ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
                LIMIT 50
                """,
                user["id"],
            )
            await conn.close()
            return [
                {
                    "id": str(r["id"]),
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                    "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
                    "topic": (r["topic"] or "").strip() or "Chat",
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Failed to list chat conversations: {e}")
            return []

    async def get_chat_messages(self, conversation_id: str) -> list:
        """Get messages for a conversation, oldest first. Returns list of dicts with role, content, created_at."""
        try:
            conn = await self.get_db_connection()
            rows = await conn.fetch(
                """
                SELECT role, content, created_at
                FROM chat_messages
                WHERE conversation_id = $1::uuid
                ORDER BY created_at ASC
                """,
                conversation_id,
            )
            await conn.close()
            return [
                {
                    "role": r["role"],
                    "content": r["content"] or "",
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Failed to get chat messages: {e}")
            return []

    async def delete_chat_conversation(self, conversation_id: str, clerk_user_id: str) -> bool:
        """Delete a chat conversation and its messages if it belongs to the user. Returns True if deleted."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                return False
            conn = await self.get_db_connection()
            result = await conn.execute(
                "DELETE FROM chat_conversations WHERE id = $1::uuid AND user_id = $2::uuid",
                conversation_id,
                user["id"],
            )
            await conn.close()
            return result.lower() == "delete 1"
        except Exception as e:
            logger.error("Failed to delete chat conversation: %s", e)
            return False

    async def get_user_id_by_conversation_id(self, conversation_id: str) -> Optional[str]:
        """Get user_id (UUID string) for a chat conversation. Returns None if not found."""
        try:
            conn = await self.get_db_connection()
            row = await conn.fetchrow(
                "SELECT user_id FROM chat_conversations WHERE id = $1::uuid",
                conversation_id,
            )
            await conn.close()
            if row and row.get("user_id"):
                return str(row["user_id"])
            return None
        except Exception as e:
            logger.error(f"Failed to get user by conversation: {e}")
            return None

    async def save_learning_plan_for_conversation(self, conversation_id: str, plan_dict: Dict[str, Any]) -> bool:
        """Save a generated learning plan to the DB, linked to the user who owns the conversation. Returns True on success."""
        try:
            user_id = await self.get_user_id_by_conversation_id(conversation_id)
            if not user_id:
                logger.warning("save_learning_plan_for_conversation: no user_id for conversation %s", conversation_id)
                return False
            title = plan_dict.get("title") or "Learning Plan"
            summary = plan_dict.get("description") or plan_dict.get("summary") or ""
            goals = plan_dict.get("learning_outcomes") or []
            conn = await self.get_db_connection()
            await self._ensure_learning_plans_table(conn)
            await conn.execute(
                """
                INSERT INTO learning_plans (user_id, title, summary, goals, status, plan_data)
                VALUES ($1::uuid, $2, $3, $4::jsonb, 'active', $5::jsonb)
                """,
                user_id,
                title,
                summary,
                json.dumps(goals),
                json.dumps(plan_dict),
            )
            await conn.close()
            logger.info("Saved learning plan for user %s", user_id)
            return True
        except Exception as e:
            logger.error("Failed to save learning plan for conversation: %s", e)
            return False

    async def save_learning_plan_for_clerk_user(self, clerk_user_id: str, plan_dict: Dict[str, Any]) -> bool:
        """Save a learning plan for the user identified by clerk_user_id (fallback when conversation id is not in our DB)."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                logger.warning("save_learning_plan_for_clerk_user: user not found for clerk_user_id (user may not be registered)")
                return False
            user_id = user["id"]
            title = plan_dict.get("title") or "Learning Plan"
            summary = plan_dict.get("description") or plan_dict.get("summary") or ""
            goals = plan_dict.get("learning_outcomes") or []
            conn = await self.get_db_connection()
            await self._ensure_learning_plans_table(conn)
            await conn.execute(
                """
                INSERT INTO learning_plans (user_id, title, summary, goals, status, plan_data)
                VALUES ($1::uuid, $2, $3, $4::jsonb, 'active', $5::jsonb)
                """,
                user_id,
                title,
                summary,
                json.dumps(goals),
                json.dumps(plan_dict),
            )
            await conn.close()
            logger.info("Saved learning plan for clerk user (plan title: %s)", title)
            return True
        except Exception as e:
            logger.exception("Failed to save learning plan for clerk user: %s", e)
            return False

    async def _ensure_learning_plans_table(self, conn) -> None:
        """Create learning_plans table and plan_data column if they do not exist."""
        await conn.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
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
        await conn.execute("ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS plan_data JSONB DEFAULT '{}'")
        await conn.execute("ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0")
        await conn.execute("ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0")
        await conn.execute("ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}'")

    async def list_learning_plans(self, clerk_user_id: str) -> list:
        """List learning plans for the user, most recent first. Returns list of dicts with id, title, summary, status, plan_data, created_at."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                logger.info("list_learning_plans: no user found for clerk_user_id=%s", clerk_user_id[:20] + "..." if len(clerk_user_id or "") > 20 else clerk_user_id)
                return []
            conn = await self.get_db_connection()
            try:
                rows = await conn.fetch(
                """
                SELECT id, title, summary, status, plan_data, created_at, updated_at,
                       COALESCE(time_spent_minutes, 0) AS time_spent_minutes,
                       COALESCE(overall_progress, 0) AS overall_progress,
                       COALESCE(progress_data, '{}'::jsonb) AS progress_data
                FROM learning_plans
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 50
                """,
                user["id"],
            )
            except Exception as table_err:
                err_msg = str(table_err).lower()
                if "learning_plans" in err_msg or "does not exist" in err_msg or "undefined_table" in err_msg or "column" in err_msg:
                    await self._ensure_learning_plans_table(conn)
                    rows = await conn.fetch(
                        """
                        SELECT id, title, summary, status, plan_data, created_at, updated_at,
                               COALESCE(time_spent_minutes, 0) AS time_spent_minutes,
                               COALESCE(overall_progress, 0) AS overall_progress,
                               COALESCE(progress_data, '{}'::jsonb) AS progress_data
                        FROM learning_plans
                        WHERE user_id = $1
                        ORDER BY created_at DESC
                        LIMIT 50
                        """,
                        user["id"],
                    )
                else:
                    await conn.close()
                    raise
            await conn.close()
            out = []
            for r in rows:
                plan_data = r.get("plan_data")
                if isinstance(plan_data, str):
                    try:
                        plan_data = json.loads(plan_data) if plan_data else {}
                    except Exception:
                        plan_data = {}
                prog_data = r.get("progress_data")
                if isinstance(prog_data, str):
                    try:
                        prog_data = json.loads(prog_data) if prog_data else {}
                    except Exception:
                        prog_data = {}
                out.append({
                    "id": str(r["id"]),
                    "title": r.get("title") or "Learning Plan",
                    "summary": r.get("summary") or "",
                    "status": r.get("status") or "active",
                    "plan_data": plan_data or {},
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                    "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
                    "time_spent_minutes": int(r.get("time_spent_minutes") or 0),
                    "overall_progress": int(r.get("overall_progress") or 0),
                    "progress_data": prog_data if isinstance(prog_data, dict) else {},
                })
            return out
        except Exception as e:
            logger.error("Failed to list learning plans: %s", e)
            return []

    async def get_learning_plan_by_id(self, plan_id: str, clerk_user_id: str) -> Optional[Dict[str, Any]]:
        """Get a single learning plan by id if it belongs to the user. Returns dict with id, title, summary, plan_data, etc."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                return None
            conn = await self.get_db_connection()
            try:
                row = await conn.fetchrow(
                    """
                    SELECT id, title, summary, status, plan_data, goals, created_at, updated_at,
                           COALESCE(time_spent_minutes, 0) AS time_spent_minutes,
                           COALESCE(overall_progress, 0) AS overall_progress,
                           COALESCE(progress_data, '{}'::jsonb) AS progress_data
                    FROM learning_plans
                    WHERE id = $1::uuid AND user_id = $2::uuid
                    """,
                    plan_id,
                    user["id"],
                )
            except Exception as fetch_err:
                err_msg = str(fetch_err).lower()
                if "column" in err_msg or "does not exist" in err_msg:
                    await self._ensure_learning_plans_table(conn)
                    row = await conn.fetchrow(
                        """
                        SELECT id, title, summary, status, plan_data, goals, created_at, updated_at,
                               COALESCE(time_spent_minutes, 0) AS time_spent_minutes,
                               COALESCE(overall_progress, 0) AS overall_progress,
                               COALESCE(progress_data, '{}'::jsonb) AS progress_data
                        FROM learning_plans
                        WHERE id = $1::uuid AND user_id = $2::uuid
                        """,
                        plan_id,
                        user["id"],
                    )
                else:
                    await conn.close()
                    raise
            await conn.close()
            if not row:
                return None
            plan_data = row.get("plan_data")
            if isinstance(plan_data, str):
                try:
                    plan_data = json.loads(plan_data) if plan_data else {}
                except Exception:
                    plan_data = {}
            prog_data = row.get("progress_data")
            if isinstance(prog_data, str):
                try:
                    prog_data = json.loads(prog_data) if prog_data else {}
                except Exception:
                    prog_data = {}
            return {
                "id": str(row["id"]),
                "title": row.get("title") or "Learning Plan",
                "summary": row.get("summary") or "",
                "status": row.get("status") or "active",
                "plan_data": plan_data or {},
                "goals": row.get("goals"),
                "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
                "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
                "time_spent_minutes": int(row.get("time_spent_minutes") or 0),
                "overall_progress": int(row.get("overall_progress") or 0),
                "progress_data": prog_data if isinstance(prog_data, dict) else {},
            }
        except Exception as e:
            logger.error("Failed to get learning plan: %s", e)
            return None

    async def update_plan_progress(
        self,
        plan_id: str,
        clerk_user_id: str,
        time_spent_minutes: Optional[int] = None,
        overall_progress: Optional[int] = None,
        progress_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Update progress for a learning plan. Returns True if updated."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                return False
            conn = await self.get_db_connection()
            await self._ensure_learning_plans_table(conn)
            updates = []
            params = []
            n = 1
            if time_spent_minutes is not None:
                updates.append(f"time_spent_minutes = ${n}")
                params.append(time_spent_minutes)
                n += 1
            if overall_progress is not None:
                updates.append(f"overall_progress = ${n}")
                params.append(min(100, max(0, overall_progress)))
                n += 1
            if progress_data is not None:
                updates.append(f"progress_data = ${n}::jsonb")
                params.append(json.dumps(progress_data))
                n += 1
            if not updates:
                await conn.close()
                return True
            updates.append("updated_at = NOW()")
            params.extend([plan_id, user["id"]])
            # WHERE uses $n and $n+1 (e.g. $4 and $5 when we have 3 SET params)
            await conn.execute(
                f"UPDATE learning_plans SET {', '.join(updates)} WHERE id = ${n}::uuid AND user_id = ${n + 1}::uuid",
                *params,
            )
            await conn.close()
            return True
        except Exception as e:
            logger.error("Failed to update plan progress: %s", e)
            return False

    async def delete_learning_plan(self, plan_id: str, clerk_user_id: str) -> bool:
        """Delete a learning plan if it belongs to the user. Returns True if deleted."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user or not user.get("id"):
                return False
            conn = await self.get_db_connection()
            result = await conn.execute(
                "DELETE FROM learning_plans WHERE id = $1::uuid AND user_id = $2::uuid",
                plan_id,
                user["id"],
            )
            await conn.close()
            return result and "DELETE 1" in result
        except Exception as e:
            logger.error("Failed to delete learning plan: %s", e)
            return False

    async def _ensure_app_settings_table(self, conn) -> None:
        """Create app_settings table if it does not exist."""
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)

    async def get_app_setting(self, key: str) -> Optional[str]:
        """Get an app-wide setting value by key. Returns None if not set."""
        try:
            conn = await self.get_db_connection()
            await self._ensure_app_settings_table(conn)
            row = await conn.fetchrow("SELECT value FROM app_settings WHERE key = $1", key)
            await conn.close()
            return row["value"] if row and row.get("value") is not None else None
        except Exception as e:
            logger.error("Failed to get app setting %s: %s", key, e)
            return None

    async def set_app_setting(self, key: str, value: str) -> bool:
        """Set an app-wide setting. Returns True on success."""
        try:
            conn = await self.get_db_connection()
            await self._ensure_app_settings_table(conn)
            await conn.execute(
                """
                INSERT INTO app_settings (key, value, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
                """,
                key,
                value,
            )
            await conn.close()
            return True
        except Exception as e:
            logger.error("Failed to set app setting %s: %s", key, e)
            return False

    async def get_all_users_for_notifications(self) -> list:
        """Get all users for batch notifications (daily/weekly reports)."""
        try:
            conn = await self.get_db_connection()
            
            users = await conn.fetch("""
                SELECT id, email, name, preferences 
                FROM users 
                WHERE email IS NOT NULL
                ORDER BY created_at
            """)
            
            await conn.close()
            
            return [dict(user) for user in users]
            
        except Exception as e:
            logger.error(f"Failed to get users for notifications: {str(e)}")
            return []

    # --- Admin: full control over all users' data ---

    async def list_all_users_admin(self) -> list:
        """List all users (for admin). Returns id, clerk_user_id, email, name, created_at."""
        try:
            conn = await self.get_db_connection()
            rows = await conn.fetch("""
                SELECT id, clerk_user_id, email, name, created_at
                FROM users
                ORDER BY created_at DESC
            """)
            await conn.close()
            return [
                {
                    "id": str(r["id"]),
                    "clerk_user_id": r.get("clerk_user_id"),
                    "email": r.get("email") or "",
                    "name": r.get("name") or "",
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Failed to list all users (admin): {e}")
            return []

    async def list_all_learning_plans_admin(self) -> list:
        """List all learning plans with owner email/name (for admin)."""
        try:
            conn = await self.get_db_connection()
            await self._ensure_learning_plans_table(conn)
            rows = await conn.fetch("""
                SELECT lp.id, lp.user_id, lp.title, lp.summary, lp.status, lp.created_at,
                       COALESCE(lp.time_spent_minutes, 0) AS time_spent_minutes,
                       COALESCE(lp.overall_progress, 0) AS overall_progress,
                       u.email AS user_email, u.name AS user_name
                FROM learning_plans lp
                JOIN users u ON u.id = lp.user_id
                ORDER BY lp.created_at DESC
                LIMIT 500
            """)
            await conn.close()
            return [
                {
                    "id": str(r["id"]),
                    "user_id": str(r["user_id"]),
                    "user_email": r.get("user_email") or "",
                    "user_name": r.get("user_name") or "",
                    "title": r.get("title") or "Learning Plan",
                    "summary": (r.get("summary") or "")[:200],
                    "status": r.get("status") or "active",
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                    "time_spent_minutes": int(r.get("time_spent_minutes") or 0),
                    "overall_progress": int(r.get("overall_progress") or 0),
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Failed to list all learning plans (admin): {e}")
            return []

    async def list_all_chat_conversations_admin(self) -> list:
        """List all chat conversations with owner email (for admin)."""
        try:
            conn = await self.get_db_connection()
            rows = await conn.fetch("""
                SELECT c.id, c.user_id, c.created_at, c.updated_at,
                       u.email AS user_email, u.name AS user_name,
                       (SELECT LEFT(TRIM(m.content), 80) FROM chat_messages m
                        WHERE m.conversation_id = c.id ORDER BY m.created_at ASC LIMIT 1) AS topic
                FROM chat_conversations c
                JOIN users u ON u.id = c.user_id
                ORDER BY c.updated_at DESC NULLS LAST
                LIMIT 500
            """)
            await conn.close()
            return [
                {
                    "id": str(r["id"]),
                    "user_id": str(r["user_id"]),
                    "user_email": r.get("user_email") or "",
                    "user_name": r.get("user_name") or "",
                    "topic": (r.get("topic") or "").strip() or "Chat",
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                    "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Failed to list all chat conversations (admin): {e}")
            return []

    async def delete_user_by_id_admin(self, user_id: str) -> bool:
        """Delete a user and all related data (cascade). Admin only."""
        try:
            conn = await self.get_db_connection()
            await conn.execute("DELETE FROM users WHERE id = $1::uuid", user_id)
            await conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to delete user (admin): {e}")
            return False

    async def delete_learning_plan_by_id_admin(self, plan_id: str) -> bool:
        """Delete any learning plan by id. Admin only."""
        try:
            conn = await self.get_db_connection()
            result = await conn.execute("DELETE FROM learning_plans WHERE id = $1::uuid", plan_id)
            await conn.close()
            return result and "DELETE 1" in result
        except Exception as e:
            logger.error(f"Failed to delete learning plan (admin): {e}")
            return False


    async def delete_chat_conversation_by_id_admin(self, conversation_id: str) -> bool:
        """Delete any chat conversation and its messages. Admin only."""
        try:
            conn = await self.get_db_connection()
            await conn.execute("DELETE FROM chat_messages WHERE conversation_id = $1::uuid", conversation_id)
            result = await conn.execute("DELETE FROM chat_conversations WHERE id = $1::uuid", conversation_id)
            await conn.close()
            return result and "DELETE 1" in result
        except Exception as e:
            logger.error(f"Failed to delete chat conversation (admin): {e}")
            return False

    # === ACHIEVEMENTS SYSTEM ===

    async def get_all_achievements(self) -> list:
        """Get all defined achievements."""
        try:
            conn = await self.get_db_connection()
            rows = await conn.fetch("SELECT * FROM achievements ORDER BY created_at ASC")
            await conn.close()
            return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to get achievements: {e}")
            return []

    async def get_user_achievements(self, clerk_user_id: str) -> list:
        """Get achievements earned by the user."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user:
                return []
            conn = await self.get_db_connection()
            rows = await conn.fetch(
                """
                SELECT a.*, ua.earned_at
                FROM achievements a
                JOIN user_achievements ua ON a.id = ua.achievement_id
                WHERE ua.user_id = $1
                """,
                user["id"]
            )
            await conn.close()
            return [
                {
                    **dict(r),
                    "earned_at": r["earned_at"].isoformat() if r["earned_at"] else None
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Failed to get user achievements: {e}")
            return []

    async def grant_achievement(self, clerk_user_id: str, slug: str) -> bool:
        """Grant an achievement to a user by slug. Returns True if newly granted."""
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user:
                return False
            conn = await self.get_db_connection()
            
            # Get achievement ID
            ach = await conn.fetchrow("SELECT id FROM achievements WHERE slug = $1", slug)
            if not ach:
                await conn.close()
                return False
            
            # Insert if not exists
            try:
                await conn.execute(
                    """
                    INSERT INTO user_achievements (user_id, achievement_id, earned_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    user["id"], ach["id"]
                )
                await conn.close()
                return True
            except Exception:
                await conn.close()
                return False
        except Exception as e:
            logger.error(f"Failed to grant achievement: {e}")
            return False

    async def grant_achievement_by_email(self, email: str, slug: str) -> bool:
        """Admin helper: grant achievement by email."""
        try:
            user = await self.get_user_by_email(email)
            if not user:
                return False
            
            conn = await self.get_db_connection()
            ach = await conn.fetchrow("SELECT id FROM achievements WHERE slug = $1", slug)
            if not ach:
                await conn.close()
                return False
            
            await conn.execute(
                """
                INSERT INTO user_achievements (user_id, achievement_id, earned_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (user_id, achievement_id) DO NOTHING
                """,
                user["id"], ach["id"]
            )
            await conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to grant achievement by email: {e}")
            return False

    async def check_achievements(self, clerk_user_id: str):
        """
        Check and award standard achievements based on user progress.
        """
        try:
            user = await self.get_user_by_clerk_id(clerk_user_id)
            if not user:
                return

            conn = await self.get_db_connection()
            
            # 1. Check Learning Plans count (proxy for modules)
            plan_count = await conn.fetchval("SELECT COUNT(*) FROM learning_plans WHERE user_id = $1", user["id"])
            
            # 2. Check Completed Plans count
            completed_count = await conn.fetchval(
                "SELECT COUNT(*) FROM learning_plans WHERE user_id = $1 AND (status = 'completed' OR overall_progress = 100)", 
                user["id"]
            )
            
            await conn.close()
            
            awards = []
            if plan_count >= 1: awards.append('iron-scholar')
            if plan_count >= 5: awards.append('bronze-learner')
            if plan_count >= 10: awards.append('silver-student')
            
            if completed_count >= 1: awards.append('gold-graduate')
            if completed_count >= 5: awards.append('platinum-pro')

            # Grant
            for slug in awards:
                await self.grant_achievement(clerk_user_id, slug)
                
        except Exception as e:
            logger.error(f"Error checking achievements: {e}")


# Example usage and testing
async def test_user_service():
    """Test the user service functionality."""
    print("🧪 Testing User Service")
    
    user_service = UserService()
    
    # Test user creation
    test_user_data = {
        "clerk_user_id": "user_test123",
        "email": "support@vayuinnovations.com",  # Use verified email for testing
        "name": "Test User"
    }
    
    print(f"\n1️⃣ Creating user: {test_user_data['email']}")
    result = await user_service.create_user_from_clerk(**test_user_data)
    print(f"Result: {result}")
    
    if result["success"]:
        user_id = result["user_id"]
        
        # Test getting user by Clerk ID
        print(f"\n2️⃣ Getting user by Clerk ID")
        user = await user_service.get_user_by_clerk_id(test_user_data["clerk_user_id"])
        print(f"User found: {user is not None}")
        
        # Test learning plan notification
        print(f"\n3️⃣ Sending learning plan notification")
        plan_data = {
            "title": "AI Fundamentals Learning Path",
            "summary": "A comprehensive introduction to artificial intelligence",
            "duration": "4 weeks",
            "topics": ["Machine Learning", "Neural Networks", "Deep Learning"]
        }
        
        success = await user_service.send_learning_plan_notification(user_id, plan_data)
        print(f"Learning plan notification sent: {success}")
        
        # Test milestone notification
        print(f"\n4️⃣ Sending milestone notification")
        milestone_data = {
            "milestone": "Completed Module 1: Introduction to AI",
            "progress": 25,
            "next_steps": "Continue with Module 2: Machine Learning Basics"
        }
        
        success = await user_service.send_progress_milestone_notification(user_id, milestone_data)
        print(f"Milestone notification sent: {success}")

if __name__ == "__main__":
    # Run tests
    asyncio.run(test_user_service())
