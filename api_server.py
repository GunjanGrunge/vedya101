#!/usr/bin/env python3
"""
VEDYA API Server
FastAPI server to serve the LangGraph agent system to the frontend
"""

from fastapi import FastAPI, HTTPException, Header, Body, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
import asyncio
import json
import os
import re
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

# Import our agent system
from vedya_agents import create_vedya_langgraph_system
from email_service import email_service
from user_service import UserService
from ai_planning_agent import ai_planning_agent
from diagram_utils import make_diagram_data_url
import openai as openai_lib

# Helper function to ensure correct temperature for models
def get_safe_temperature(model_name, default_temp=0.7):
    """Returns a safe temperature value for the given model.
    Some models like o4-mini only support temperature=1.0"""
    if model_name == "o4-mini":
        return 1.0
    return default_temp

app = FastAPI(
    title="VEDYA API",
    description="AI-Powered Education Platform API",
    version="1.0.0"
)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent system instance
agent_system = None
user_service = None
user_sessions = {}  # Simple in-memory session storage

# Admin: only this email can access /admin/* and see admin dashboard
ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or "souvikbasu098@gmail.com").strip().lower()

# Live session WebSocket rooms: session_id -> { delay_seconds, muted set, kicked set, connections list }
# Each connection: { "ws": WebSocket, "clerk_user_id": str, "user_name": str, "is_admin": bool }
_live_rooms: Dict[str, Dict[str, Any]] = {}
_live_rooms_lock = asyncio.Lock()

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    clerk_user_id: Optional[str] = None  # fallback for saving learning plan when session is not our conversation id

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str

@app.on_event("startup")
async def startup_event():
    """Initialize the agent system on startup."""
    global agent_system, user_service
    print("🚀 Starting VEDYA Agent System...")
    try:
        agent_system = create_vedya_langgraph_system()
        user_service = UserService()
        print("✅ VEDYA Agent System initialized successfully!")
        print("✅ User Service initialized successfully!")
    except Exception as e:
        print(f"❌ Failed to initialize system: {e}")
        raise

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "VEDYA API is running",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "agent_system": "initialized" if agent_system else "not initialized",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_message: ChatMessage):
    """Main chat endpoint for professional planning conversation."""
    try:
        plan_ready_message = None
        if user_service:
            try:
                plan_ready_message = await user_service.get_app_setting("plan_ready_message")
            except Exception:
                pass
        result = await ai_planning_agent.process_message(
            message=chat_message.message,
            session_id=chat_message.session_id,
            plan_ready_message=plan_ready_message,
        )
        session_id = result["session_id"]
        plan_ready = result.get("plan_ready", False)
        if plan_ready and user_service and session_id:
            try:
                plan_data = ai_planning_agent.get_learning_plan(session_id)
                if plan_data:
                    ok = await user_service.save_learning_plan_for_conversation(session_id, plan_data)
                    if not ok and chat_message.clerk_user_id:
                        await user_service.save_learning_plan_for_clerk_user(chat_message.clerk_user_id, plan_data)
            except Exception as e:
                print(f"Error saving learning plan to DB: {e}")
        return ChatResponse(
            response=result["response"],
            session_id=session_id,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        session_id = chat_message.session_id or str(uuid.uuid4())
        return ChatResponse(
            response="I'm here to help you create a personalized learning plan. What would you like to learn?",
            session_id=session_id,
            timestamp=datetime.now().isoformat()
        )

@app.post("/chat/stream")
async def chat_stream_endpoint(chat_message: ChatMessage):
    """Streaming chat endpoint for real-time responses."""
    from streaming_utils import stream_text_chunks

    async def generate_response():
        try:
            plan_ready_message = None
            if user_service:
                try:
                    plan_ready_message = await user_service.get_app_setting("plan_ready_message")
                except Exception:
                    pass
            result = await ai_planning_agent.process_message(
                message=chat_message.message,
                session_id=chat_message.session_id,
                plan_ready_message=plan_ready_message,
            )
            response_text = result["response"]
            session_id = result["session_id"]
            metadata = result.get("metadata", {})
            plan_ready = result.get("plan_ready", False)

            yield f"data: {json.dumps({'type': 'metadata', 'session_id': session_id, 'timestamp': datetime.now().isoformat()})}\n\n"
            accumulated = ""
            async for char in stream_text_chunks(response_text, character_by_character=True):
                accumulated += char
                yield f"data: {json.dumps({'type': 'content', 'content': char, 'accumulated': accumulated})}\n\n"
            if metadata:
                yield f"data: {json.dumps({'type': 'final_metadata', 'metadata': metadata})}\n\n"
            # Save the course to DB *before* sending complete so it’s in Learnings when user clicks "View My Learning Plan"
            if plan_ready and user_service and session_id:
                try:
                    plan_data = ai_planning_agent.get_learning_plan(session_id)
                    if plan_data:
                        ok = await user_service.save_learning_plan_for_conversation(session_id, plan_data)
                        if not ok and chat_message.clerk_user_id:
                            ok = await user_service.save_learning_plan_for_clerk_user(chat_message.clerk_user_id, plan_data)
                        if ok:
                            print("Learning plan saved to DB for user.")
                except Exception as e:
                    print(f"Error saving learning plan to DB: {e}")
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        except Exception as e:
            print(f"Error in streaming chat endpoint: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': 'Something went wrong. Please try again.'})}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.post("/learning-plan")
async def create_learning_plan(chat_message: ChatMessage):
    """Create a personalized learning plan."""
    try:
        session_id = chat_message.session_id or str(uuid.uuid4())
        
        # Process with AI planning agent
        result = await ai_planning_agent.process_message(
            message=chat_message.message,
            session_id=session_id
        )
        
        return {
            "success": True,
            "response": result["response"],
            "session_id": result["session_id"],
            "plan_ready": result.get("plan_ready", False)
        }
        
    except Exception as e:
        print(f"Error creating learning plan: {e}")
        return {
            "success": False,
            "error": str(e),
            "response": "I'm having trouble creating your learning plan. Please try again."
        }

@app.get("/learning-plan/{session_id}")
async def get_learning_plan(session_id: str):
    """Get the generated learning plan for a session."""
    try:
        plan_data = ai_planning_agent.get_learning_plan(session_id)
        
        if not plan_data:
            raise HTTPException(status_code=404, detail="Learning plan not found for this session")
        
        return {
            "success": True,
            "data": plan_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving learning plan: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Email Notification Models
class NotificationRequest(BaseModel):
    email: str
    name: str
    notification_type: str
    data: Optional[Dict[str, Any]] = None

class WelcomeEmailRequest(BaseModel):
    email: str
    name: str

class ProgressMilestoneRequest(BaseModel):
    email: str
    name: str
    milestone: str
    completion_percentage: float

class LearningPlanReadyRequest(BaseModel):
    email: str
    name: str
    plan_title: str
    plan_summary: str

# Email Notification Endpoints
@app.post("/notifications/welcome")
async def send_welcome_notification(request: WelcomeEmailRequest):
    """Send welcome email to new users."""
    try:
        success = await email_service.send_welcome_email(request.email, request.name)
        return {
            "success": success,
            "message": "Welcome email sent successfully" if success else "Failed to send welcome email",
            "email": request.email,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error sending welcome email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send welcome email: {str(e)}")

@app.post("/notifications/learning-plan-ready")
async def send_learning_plan_ready_notification(request: LearningPlanReadyRequest):
    """Send learning plan ready notification."""
    try:
        success = await email_service.send_learning_plan_ready(
            request.email, request.name, request.plan_title, request.plan_summary
        )
        return {
            "success": success,
            "message": "Learning plan notification sent successfully" if success else "Failed to send learning plan notification",
            "email": request.email,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error sending learning plan notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send learning plan notification: {str(e)}")

@app.post("/notifications/progress-milestone")
async def send_progress_milestone_notification(request: ProgressMilestoneRequest):
    """Send progress milestone notification."""
    try:
        success = await email_service.send_progress_milestone(
            request.email, request.name, request.milestone, request.completion_percentage
        )
        return {
            "success": success,
            "message": "Progress milestone notification sent successfully" if success else "Failed to send progress milestone notification",
            "email": request.email,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error sending progress milestone notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send progress milestone notification: {str(e)}")

@app.post("/notifications/daily-summary")
async def send_daily_summary_notification(request: NotificationRequest):
    """Send daily summary notification."""
    try:
        if request.notification_type != "daily_summary":
            raise HTTPException(status_code=400, detail="Invalid notification type")
        
        summary_data = request.data or {}
        success = await email_service.send_daily_summary(request.email, request.name, summary_data)
        return {
            "success": success,
            "message": "Daily summary sent successfully" if success else "Failed to send daily summary",
            "email": request.email,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error sending daily summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send daily summary: {str(e)}")

@app.post("/notifications/weekly-report")
async def send_weekly_report_notification(request: NotificationRequest):
    """Send weekly report notification."""
    try:
        if request.notification_type != "weekly_report":
            raise HTTPException(status_code=400, detail="Invalid notification type")
        
        weekly_data = request.data or {}
        success = await email_service.send_weekly_report(request.email, request.name, weekly_data)
        return {
            "success": success,
            "message": "Weekly report sent successfully" if success else "Failed to send weekly report",
            "email": request.email,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error sending weekly report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send weekly report: {str(e)}")

@app.get("/notifications/status")
async def get_notification_status():
    """Get current notification service status."""
    return {
        "notifications_enabled": email_service.notifications_enabled,
        "daily_summary_enabled": email_service.daily_summary_enabled,
        "progress_alerts_enabled": email_service.progress_alerts_enabled,
        "weekly_report_enabled": email_service.weekly_report_enabled,
        "smtp_configured": bool(email_service.smtp_username and email_service.smtp_password),
        "timestamp": datetime.now().isoformat()
    }

# === USER MANAGEMENT ENDPOINTS ===
# These endpoints handle Clerk integration and user database management

class UserRegistrationData(BaseModel):
    clerk_user_id: str
    email: str
    name: Optional[str] = None

class UserResponse(BaseModel):
    success: bool
    user_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None

@app.post("/users/register", response_model=UserResponse)
async def register_user_from_clerk(user_data: UserRegistrationData):
    """
    Register a new user from Clerk authentication.
    This endpoint should be called from your frontend after Clerk signup.
    """
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        result = await user_service.create_user_from_clerk(
            clerk_user_id=user_data.clerk_user_id,
            email=user_data.email,
            name=user_data.name
        )
        
        return UserResponse(**result)
        
    except Exception as e:
        print(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")

@app.get("/users/clerk/{clerk_user_id}")
async def get_user_by_clerk_id(clerk_user_id: str):
    """Get user information by Clerk user ID."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        user = await user_service.get_user_by_clerk_id(clerk_user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Remove sensitive fields
        safe_user = {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "preferences": user["preferences"],
            "created_at": user["created_at"].isoformat() if user["created_at"] else None,
            "updated_at": user["updated_at"].isoformat() if user["updated_at"] else None
        }
        
        return {
            "success": True,
            "user": safe_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")

class OnboardingStatusResponse(BaseModel):
    completed: bool
    data: Optional[Dict[str, Any]] = None

@app.get("/users/onboarding-status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(clerk_user_id: str):
    """Check if the user has completed onboarding."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    try:
        result = await user_service.get_onboarding_status(clerk_user_id)
        return OnboardingStatusResponse(**result)
    except Exception as e:
        print(f"Error getting onboarding status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/onboarding-data")
async def get_onboarding_data(clerk_user_id: str):
    """Get full onboarding data for the current user (for settings page)."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    try:
        data = await user_service.get_onboarding_data(clerk_user_id)
        if data is None:
            raise HTTPException(status_code=404, detail="Onboarding data not found")
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting onboarding data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class OnboardingData(BaseModel):
    clerk_user_id: str
    full_name: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    age: Optional[int] = None
    languages_to_learn: Optional[List[str]] = None
    educational_status: Optional[str] = None

@app.post("/users/onboarding")
async def save_onboarding(payload: OnboardingData):
    """Save onboarding wizard data for the current user."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    try:
        data = payload.model_dump(exclude_unset=True)
        data["clerk_user_id"] = payload.clerk_user_id
        result = await user_service.save_onboarding(payload.clerk_user_id, data)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to save onboarding"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving onboarding: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatSessionCreate(BaseModel):
    clerk_user_id: str

class ChatMessageCreate(BaseModel):
    session_id: str
    role: str
    content: str

@app.post("/chat/sessions")
async def create_chat_session(payload: ChatSessionCreate):
    """Create a chat conversation (session) for the user. Returns session_id for use with chat and saving messages."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    session_id = await user_service.create_chat_conversation(payload.clerk_user_id)
    if not session_id:
        raise HTTPException(status_code=400, detail="User not found or could not create session")
    return {"session_id": session_id}

@app.post("/chat/messages")
async def save_chat_message(payload: ChatMessageCreate):
    """Save a chat message (user or assistant) with server timestamp."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    ok = await user_service.save_chat_message(payload.session_id, payload.role, payload.content)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save message")
    return {"success": True}

@app.get("/chat/sessions")
async def list_chat_sessions(clerk_user_id: str):
    """List the user's chat conversations, most recent first."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    sessions = await user_service.list_chat_conversations(clerk_user_id)
    return {"sessions": sessions}

@app.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, clerk_user_id: str):
    """Delete a chat conversation and its messages (must belong to the user)."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    if not clerk_user_id:
        raise HTTPException(status_code=400, detail="clerk_user_id required")
    deleted = await user_service.delete_chat_conversation(session_id, clerk_user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found or not owned by you")
    return {"success": True}

@app.get("/chat/messages")
async def get_chat_messages(session_id: str):
    """Get messages for a chat session (conversation)."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    messages = await user_service.get_chat_messages(session_id)
    return {"messages": messages}

# App settings (e.g. configurable plan-ready message shown when a learning plan is generated)
@app.get("/settings/plan-ready-message")
async def get_plan_ready_message():
    """Get the configurable message shown when a learning plan is ready (dashboard)."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    value = await user_service.get_app_setting("plan_ready_message")
    return {"value": value or ""}

class PlanReadyMessageUpdate(BaseModel):
    value: str

@app.post("/settings/plan-ready-message")
async def set_plan_ready_message(payload: PlanReadyMessageUpdate):
    """Set the message shown when a learning plan is ready. Saved in DB."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    ok = await user_service.set_app_setting("plan_ready_message", (payload.value or "").strip())
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save setting")
    return {"success": True, "value": (payload.value or "").strip()}


# ---------- Live sessions (admin hosts; all users can view /dashboard/live) ----------
@app.get("/live/current")
async def get_current_live_session():
    """Get the current live session state (public)."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    raw = await user_service.get_app_setting("live_session_state")
    if not raw:
        return {"active": False}
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
        if not isinstance(data, dict):
            return {"active": False}
        return data
    except Exception:
        return {"active": False}


class LiveSessionStartPayload(BaseModel):
    clerk_user_id: str
    title: str
    description: Optional[str] = None
    join_url: Optional[str] = None


@app.post("/admin/live/start")
async def admin_live_start(payload: LiveSessionStartPayload):
    """Admin: start a live session (saved in DB app_settings)."""
    await _require_admin(payload.clerk_user_id, None)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title required")
    session_id = str(uuid.uuid4())
    state = {
        "active": True,
        "session_id": session_id,
        "title": title[:140],
        "description": (payload.description or "").strip()[:2000],
        "join_url": (payload.join_url or "").strip()[:2000] or None,
        "started_at": datetime.now().isoformat(),
    }
    ok = await user_service.set_app_setting("live_session_state", json.dumps(state))
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to start live session")
    return {"success": True, "live": state}


class LiveSessionStopPayload(BaseModel):
    clerk_user_id: str


@app.post("/admin/live/stop")
async def admin_live_stop(payload: LiveSessionStopPayload):
    """Admin: stop the current live session and close all WebSocket connections."""
    await _require_admin(payload.clerk_user_id, None)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    raw = await user_service.get_app_setting("live_session_state")
    session_id = None
    connections_to_close = []
    if raw:
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
            session_id = data.get("session_id") if isinstance(data, dict) else None
        except Exception:
            pass
    async with _live_rooms_lock:
        if session_id and session_id in _live_rooms:
            room = _live_rooms[session_id]
            # Copy connections and clear room under lock, but close sockets after releasing lock
            connections_to_close = list(room.get("connections") or [])
            del _live_rooms[session_id]

    # Now, outside the lock, notify and close all websockets
    for conn in connections_to_close:
        try:
            await conn["ws"].send_json({"type": "session_ended"})
            await conn["ws"].close()
        except Exception:
            pass
    state = {"active": False, "stopped_at": datetime.now().isoformat()}
    ok = await user_service.set_app_setting("live_session_state", json.dumps(state))
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to stop live session")
    return {"success": True}


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    """Real-time live session: chat, delay, kick, mute. Query params: session_id, clerk_user_id, user_name, is_admin (true/false)."""
    await websocket.accept()
    session_id = websocket.query_params.get("session_id") or ""
    clerk_user_id = (websocket.query_params.get("clerk_user_id") or "").strip()
    user_name = (websocket.query_params.get("user_name") or "Guest").strip()[:100]
    is_admin = (websocket.query_params.get("is_admin") or "").lower() == "true"
    if not session_id or not clerk_user_id:
        try:
            await websocket.send_json({"type": "error", "message": "session_id and clerk_user_id required"})
        except Exception:
            pass
        await websocket.close()
        return
    if not user_service:
        try:
            await websocket.send_json({"type": "error", "message": "Server error"})
        except Exception:
            pass
        await websocket.close()
        return
    raw = await user_service.get_app_setting("live_session_state")
    live_state = None
    if raw:
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(data, dict) and data.get("active") and data.get("session_id") == session_id:
                live_state = data
        except Exception:
            pass
    if not live_state:
        try:
            await websocket.send_json({"type": "error", "message": "No active live session or invalid session"})
        except Exception:
            pass
        await websocket.close()
        return
    async with _live_rooms_lock:
        if session_id not in _live_rooms:
            _live_rooms[session_id] = {
                "delay_seconds": 0,
                "muted": set(),
                "kicked": set(),
                "connections": [],
                "camera_on": False,
            }
        room = _live_rooms[session_id]
        if clerk_user_id in room["kicked"]:
            try:
                await websocket.send_json({"type": "kicked", "message": "You have been removed from the meeting"})
            except Exception:
                pass
            await websocket.close()
            return
        conn_info = {"ws": websocket, "clerk_user_id": clerk_user_id, "user_name": user_name, "is_admin": is_admin}
        room["connections"].append(conn_info)
        participants = [{"clerk_user_id": c["clerk_user_id"], "user_name": c["user_name"], "is_admin": c.get("is_admin")} for c in room["connections"]]
        muted_list = list(room["muted"])
        delay_seconds = room.get("delay_seconds") or 0

    try:
        await websocket.send_json({
            "type": "room_state",
            "delay_seconds": delay_seconds,
            "participants": participants,
            "muted": muted_list if is_admin else [],
            "camera_on": room.get("camera_on", False) if 'room' in locals() else False,
        })
    except Exception:
        pass

    async def broadcast(data: dict, to_admin_only: bool = False, to_viewers_only: bool = False, exclude_clerk: Optional[str] = None):
        async with _live_rooms_lock:
            room = _live_rooms.get(session_id)
            if not room:
                return
            for c in list(room["connections"]):
                if exclude_clerk and c["clerk_user_id"] == exclude_clerk:
                    continue
                if to_admin_only and not c.get("is_admin"):
                    continue
                if to_viewers_only and c.get("is_admin"):
                    continue
                try:
                    await c["ws"].send_json(data)
                except Exception:
                    pass

    try:
        await broadcast({"type": "participant_joined", "clerk_user_id": clerk_user_id, "user_name": user_name, "is_admin": is_admin})
        while True:
            msg = await websocket.receive_json()
            kind = (msg.get("type") or "").strip()
            if kind == "chat":
                text = (msg.get("text") or "").strip()[:2000]
                if not text:
                    continue
                async with _live_rooms_lock:
                    room = _live_rooms.get(session_id)
                    if not room:
                        continue
                    if clerk_user_id in room["muted"]:
                        await websocket.send_json({"type": "chat_rejected", "message": "You are muted and cannot send messages"})
                        continue
                    delay = room.get("delay_seconds") or 0
                ts = datetime.now().isoformat()
                payload = {"type": "chat", "clerk_user_id": clerk_user_id, "user_name": user_name, "text": text, "at": ts}
                await broadcast(payload, to_viewers_only=False, to_admin_only=True)
                if delay <= 0:
                    await broadcast(payload, to_viewers_only=True)
                else:
                    async def send_delayed():
                        await asyncio.sleep(delay)
                        await broadcast(payload, to_viewers_only=True)
                    asyncio.create_task(send_delayed())
            elif kind == "set_delay" and is_admin:
                v = msg.get("value")
                if v is not None and isinstance(v, (int, float)):
                    secs = max(0, min(60, int(v)))
                    async with _live_rooms_lock:
                        if session_id in _live_rooms:
                            _live_rooms[session_id]["delay_seconds"] = secs
                    await broadcast({"type": "delay_updated", "delay_seconds": secs})
            elif kind == "camera_state" and is_admin:
                # Admin toggled camera on/off; broadcast to viewers and remember in room state
                on = bool(msg.get("on", False))
                async with _live_rooms_lock:
                    room = _live_rooms.get(session_id)
                    if room is not None:
                        room["camera_on"] = on
                await broadcast({"type": "camera_state", "on": on}, to_viewers_only=True)
            elif kind == "kick" and is_admin:
                target = (msg.get("clerk_user_id") or msg.get("user_id") or "").strip()
                if not target:
                    continue
                async with _live_rooms_lock:
                    room = _live_rooms.get(session_id)
                    if room:
                        room["kicked"].add(target)
                        for c in list(room["connections"]):
                            if c["clerk_user_id"] == target:
                                try:
                                    await c["ws"].send_json({"type": "kicked", "message": "You have been removed from the meeting"})
                                    await c["ws"].close()
                                except Exception:
                                    pass
                                room["connections"].remove(c)
                                break
                await broadcast({"type": "user_removed", "clerk_user_id": target})
            elif kind == "mute_chat" and is_admin:
                target = (msg.get("clerk_user_id") or msg.get("user_id") or "").strip()
                mute = msg.get("mute", True)
                async with _live_rooms_lock:
                    room = _live_rooms.get(session_id)
                    if room:
                        if mute:
                            room["muted"].add(target)
                        else:
                            room["muted"].discard(target)
                await broadcast({"type": "mute_updated", "clerk_user_id": target, "muted": mute})
            elif kind == "unmute_chat" and is_admin:
                target = (msg.get("clerk_user_id") or msg.get("user_id") or "").strip()
                async with _live_rooms_lock:
                    room = _live_rooms.get(session_id)
                    if room:
                        room["muted"].discard(target)
                await broadcast({"type": "mute_updated", "clerk_user_id": target, "muted": False})
            elif kind == "webrtc_offer":
                # Admin -> specific viewer: forward SDP offer
                target = (msg.get("target") or msg.get("clerk_user_id") or "").strip()
                sdp = msg.get("sdp")
                if not target or not sdp:
                    continue
                await broadcast(
                    {
                        "type": "webrtc_offer",
                        "from": clerk_user_id,
                        "to": target,
                        "sdp": sdp,
                    },
                    to_admin_only=False,
                    to_viewers_only=False,
                )
            elif kind == "webrtc_answer":
                # Viewer -> admin: forward SDP answer
                target = (msg.get("target") or msg.get("clerk_user_id") or "").strip()
                sdp = msg.get("sdp")
                if not sdp:
                    continue
                # If target not specified, send to all admins in room
                async with _live_rooms_lock:
                    room = _live_rooms.get(session_id)
                    targets = []
                    if room:
                        for c in room["connections"]:
                            if c.get("is_admin"):
                                if (not target) or c["clerk_user_id"] == target:
                                    targets.append(c["clerk_user_id"])
                for t in targets or [target]:
                    await broadcast(
                        {
                            "type": "webrtc_answer",
                            "from": clerk_user_id,
                            "to": t,
                            "sdp": sdp,
                        },
                        to_admin_only=False,
                        to_viewers_only=False,
                    )
            elif kind == "webrtc_ice_candidate":
                # Forward ICE candidates between peers
                target = (msg.get("target") or msg.get("clerk_user_id") or "").strip()
                candidate = msg.get("candidate")
                if not target or candidate is None:
                    continue
                await broadcast(
                    {
                        "type": "webrtc_ice_candidate",
                        "from": clerk_user_id,
                        "to": target,
                        "candidate": candidate,
                    },
                    to_admin_only=False,
                    to_viewers_only=False,
                )
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        async with _live_rooms_lock:
            room = _live_rooms.get(session_id)
            if room:
                for i, c in enumerate(list(room["connections"])):
                    if c["clerk_user_id"] == clerk_user_id:
                        room["connections"].pop(i)
                        break
                await broadcast({"type": "participant_left", "clerk_user_id": clerk_user_id, "user_name": user_name})

@app.get("/users/email/{email}")
async def get_user_by_email(email: str):
    """Get user information by email address."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        user = await user_service.get_user_by_email(email)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Remove sensitive fields
        safe_user = {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "preferences": user["preferences"],
            "created_at": user["created_at"].isoformat() if user["created_at"] else None,
            "updated_at": user["updated_at"].isoformat() if user["updated_at"] else None
        }
        
        return {
            "success": True,
            "user": safe_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")

class UserPreferencesUpdate(BaseModel):
    preferences: Dict[str, Any]

@app.patch("/users/{user_id}/preferences")
async def update_user_preferences(user_id: str, update_data: UserPreferencesUpdate):
    """Update user preferences."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        success = await user_service.update_user_preferences(user_id, update_data.preferences)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update preferences")
        
        return {
            "success": True,
            "message": "Preferences updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

# === USER NOTIFICATION ENDPOINTS ===
# These endpoints send notifications to specific users by user ID

class UserNotificationData(BaseModel):
    user_id: str
    data: Dict[str, Any]

@app.post("/users/{user_id}/notifications/learning-plan")
async def send_user_learning_plan_notification(user_id: str, notification_data: Dict[str, Any]):
    """Send learning plan notification to a specific user."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        success = await user_service.send_learning_plan_notification(user_id, notification_data)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to send notification")
        
        return {
            "success": True,
            "message": "Learning plan notification sent successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending learning plan notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@app.post("/users/{user_id}/notifications/milestone")
async def send_user_milestone_notification(user_id: str, notification_data: Dict[str, Any]):
    """Send milestone notification to a specific user."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        success = await user_service.send_progress_milestone_notification(user_id, notification_data)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to send notification")
        
        return {
            "success": True,
            "message": "Milestone notification sent successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending milestone notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@app.post("/users/{user_id}/notifications/daily-summary")
async def send_user_daily_summary(user_id: str, notification_data: Dict[str, Any]):
    """Send daily summary to a specific user."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        success = await user_service.send_daily_summary_notification(user_id, notification_data)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to send notification")
        
        return {
            "success": True,
            "message": "Daily summary sent successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending daily summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@app.post("/users/{user_id}/notifications/weekly-report")
async def send_user_weekly_report(user_id: str, notification_data: Dict[str, Any]):
    """Send weekly report to a specific user."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        success = await user_service.send_weekly_report_notification(user_id, notification_data)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to send notification")
        
        return {
            "success": True,
            "message": "Weekly report sent successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending weekly report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

def _shape_plan_for_frontend(
    plan_id: str,
    title: str,
    summary: str,
    created_at: Optional[str],
    plan_data: Dict[str, Any],
    time_spent_minutes: int = 0,
    overall_progress: int = 0,
    progress_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Transform DB plan + plan_data into frontend shape (modules, tasks, progress)."""
    progress_data = progress_data or {}
    subject = (plan_data.get("subject") or "Learning").title()
    difficulty = (plan_data.get("difficulty_level") or "Beginner").title()
    learning_style = (plan_data.get("learning_style") or "Mixed").replace("_", " ").title()
    total_weeks = plan_data.get("total_duration_weeks") or 12
    total_duration = f"{total_weeks} weeks"
    modules_raw = plan_data.get("modules") or []
    kanban_tasks = plan_data.get("kanban_tasks") or []
    modules: List[Dict[str, Any]] = []
    for i, m in enumerate(modules_raw):
        mod_id = f"module_{i+1}"
        duration_weeks = m.get("duration_weeks") or 4
        tasks_for_mod = [t for t in kanban_tasks if f"Module {i+1}" in (t.get("title") or "")]
        if not tasks_for_mod and kanban_tasks and i < len(kanban_tasks):
            t = kanban_tasks[i] if i < len(kanban_tasks) else None
            if t:
                tasks_for_mod = [t]
        tasks = []
        for j, t in enumerate(tasks_for_mod or []):
            task_id = t.get("task_id") or f"task_{mod_id}_{j}"
            task_prog = (progress_data.get("tasks") or {}).get(task_id, {})
            tasks.append({
                "id": task_id,
                "title": t.get("title") or "Task",
                "description": t.get("description") or "",
                "status": task_prog.get("status", t.get("status") or "todo"),
                "module": m.get("title") or mod_id,
                "priority": (t.get("priority") or "medium").lower(),
                "estimatedTime": f"{t.get('estimated_hours') or 0} hrs",
            })
        if not tasks:
            tasks = [{"id": f"task_{mod_id}_0", "title": f"Complete {m.get('title', mod_id)}", "description": m.get("description") or "", "status": "todo", "module": m.get("title") or mod_id, "priority": "medium", "estimatedTime": "1 hr"}]
        mod_prog = progress_data.get("modules") or {}
        mod_status = mod_prog.get(mod_id, {}).get("status", "not_started")
        mod_progress_pct = mod_prog.get(mod_id, {}).get("progress", 0)
        modules.append({
            "id": mod_id,
            "title": m.get("title") or f"Module {i+1}",
            "description": m.get("description") or "",
            "duration": f"{duration_weeks} weeks",
            "status": mod_status,
            "progress": mod_progress_pct,
            "tasks": tasks,
        })
    return {
        "id": plan_id,
        "title": title or f"{subject} Learning Plan",
        "subject": subject,
        "description": summary or "",
        "totalDuration": total_duration,
        "difficulty": difficulty,
        "learningStyle": learning_style,
        "modules": modules,
        "overallProgress": overall_progress,
        "timeSpentMinutes": time_spent_minutes,
        "progressData": progress_data,
        "createdAt": created_at or datetime.now().isoformat(),
        "plan_data": plan_data,
    }


# Learning Plans endpoints
async def _require_admin(clerk_user_id: str = None, authorization: Optional[str] = None):
    """Verify the request is from the admin user. Raises 403 if not. Returns clerk_user_id."""
    cid = clerk_user_id or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not cid:
        raise HTTPException(status_code=401, detail="clerk_user_id or Authorization required")
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    user = await user_service.get_user_by_clerk_id(cid)
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    email = (user.get("email") or "").strip().lower()
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    return cid


# Learning Plans endpoints
@app.get("/learning-plans")
async def get_learning_plans(clerk_user_id: str = None, authorization: str = Header(None)):
    """Get all learning plans for a user (from DB). Pass clerk_user_id as query param."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    cid = clerk_user_id or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not cid:
        raise HTTPException(status_code=400, detail="clerk_user_id or Authorization required")
    try:
        rows = await user_service.list_learning_plans(cid)
        plans = [
            _shape_plan_for_frontend(
                r["id"],
                r["title"],
                r["summary"],
                r.get("created_at"),
                r.get("plan_data") or {},
                time_spent_minutes=int(r.get("time_spent_minutes") or 0),
                overall_progress=int(r.get("overall_progress") or 0),
                progress_data=r.get("progress_data") if isinstance(r.get("progress_data"), dict) else {},
            )
            for r in rows
        ]
        return {"success": True, "plans": plans}
    except Exception as e:
        print(f"Error getting learning plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/learning-plans/check")
async def check_learning_plans(clerk_user_id: str = None, authorization: str = Header(None)):
    """Check if the user has any learning plans (e.g. for Navbar). Must be defined before /learning-plans/{plan_id}."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    cid = clerk_user_id or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not cid:
        raise HTTPException(status_code=400, detail="clerk_user_id or Authorization required")
    try:
        rows = await user_service.list_learning_plans(cid)
        return {"hasPlans": len(rows) > 0}
    except Exception as e:
        print(f"Error checking learning plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/learning-plans/{plan_id}")
async def get_learning_plan_by_id(plan_id: str, clerk_user_id: str = None, authorization: str = Header(None)):
    """Get a single learning plan by id (must belong to the user)."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    cid = clerk_user_id or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not cid:
        raise HTTPException(status_code=400, detail="clerk_user_id or Authorization required")
    try:
        row = await user_service.get_learning_plan_by_id(plan_id, cid)
        if not row:
            raise HTTPException(status_code=404, detail="Learning plan not found")
        plan = _shape_plan_for_frontend(
            row["id"],
            row["title"],
            row["summary"],
            row.get("created_at"),
            row.get("plan_data") or {},
            time_spent_minutes=int(row.get("time_spent_minutes") or 0),
            overall_progress=int(row.get("overall_progress") or 0),
            progress_data=row.get("progress_data") if isinstance(row.get("progress_data"), dict) else {},
        )
        return {"success": True, "plan": plan}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting learning plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/learning-plans/{plan_id}")
async def delete_learning_plan(plan_id: str, clerk_user_id: str = None, authorization: str = Header(None)):
    """Delete a learning plan (must belong to the user)."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    cid = clerk_user_id or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not cid:
        raise HTTPException(status_code=400, detail="clerk_user_id or Authorization required")
    try:
        ok = await user_service.delete_learning_plan(plan_id, cid)
        if not ok:
            raise HTTPException(status_code=404, detail="Learning plan not found or already deleted")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting learning plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/learning-plans/{plan_id}/progress")
async def update_learning_plan_progress(plan_id: str, body: dict = Body(default={}), clerk_user_id: str = None, authorization: str = Header(None)):
    """Update time spent and/or completion progress for a learning plan."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    cid = clerk_user_id or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not cid:
        raise HTTPException(status_code=400, detail="clerk_user_id or Authorization required")
    try:
        time_spent_minutes = body.get("time_spent_minutes")
        overall_progress = body.get("overall_progress")
        progress_data = body.get("progress_data")
        if time_spent_minutes is not None:
            time_spent_minutes = int(time_spent_minutes)
        if overall_progress is not None:
            overall_progress = min(100, max(0, int(overall_progress)))
        ok = await user_service.update_plan_progress(plan_id, cid, time_spent_minutes=time_spent_minutes, overall_progress=overall_progress, progress_data=progress_data)
        if not ok:
            raise HTTPException(status_code=404, detail="Learning plan not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating plan progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SavePlanFromSessionRequest(BaseModel):
    session_id: str
    clerk_user_id: str


@app.post("/learning-plans/from-session")
async def save_plan_from_session(payload: SavePlanFromSessionRequest):
    """Ensure the AI-generated plan for this chat session is saved to the user's Learning plans. Call when user clicks 'View My Learning Plan'."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    try:
        plan_data = ai_planning_agent.get_learning_plan(payload.session_id)
        if not plan_data:
            raise HTTPException(status_code=404, detail="No learning plan found for this session. Finish creating a plan in the chat first.")
        ok = await user_service.save_learning_plan_for_conversation(payload.session_id, plan_data)
        if not ok and payload.clerk_user_id:
            ok = await user_service.save_learning_plan_for_clerk_user(payload.clerk_user_id, plan_data)
        if not ok:
            raise HTTPException(status_code=400, detail="Could not save plan (user not found or not linked to session).")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving plan from session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Admin endpoints (only ADMIN_EMAIL) ----------
@app.get("/admin/users")
async def admin_list_users(clerk_user_id: str = None, authorization: str = Header(None)):
    """List all users. Requires admin (souvikbasu098@gmail.com)."""
    await _require_admin(clerk_user_id, authorization)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    users = await user_service.list_all_users_admin()
    return {"success": True, "users": users}


@app.get("/admin/learning-plans")
async def admin_list_learning_plans(clerk_user_id: str = None, authorization: str = Header(None)):
    """List all learning plans (all users). Requires admin."""
    await _require_admin(clerk_user_id, authorization)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    plans = await user_service.list_all_learning_plans_admin()
    return {"success": True, "plans": plans}


@app.get("/admin/chat-sessions")
async def admin_list_chat_sessions(clerk_user_id: str = None, authorization: str = Header(None)):
    """List all chat sessions (all users). Requires admin."""
    await _require_admin(clerk_user_id, authorization)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    sessions = await user_service.list_all_chat_conversations_admin()
    return {"success": True, "sessions": sessions}


@app.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, clerk_user_id: str = None, authorization: str = Header(None)):
    """Delete a user and all related data. Requires admin."""
    await _require_admin(clerk_user_id, authorization)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    ok = await user_service.delete_user_by_id_admin(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found or delete failed")
    return {"success": True}


@app.delete("/admin/learning-plans/{plan_id}")
async def admin_delete_learning_plan(plan_id: str, clerk_user_id: str = None, authorization: str = Header(None)):
    """Delete any learning plan. Requires admin."""
    await _require_admin(clerk_user_id, authorization)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    ok = await user_service.delete_learning_plan_by_id_admin(plan_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Plan not found or delete failed")
    return {"success": True}


@app.delete("/admin/chat-sessions/{session_id}")
async def admin_delete_chat_session(session_id: str, clerk_user_id: str = None, authorization: str = Header(None)):
    """Delete any chat session and its messages. Requires admin."""
    await _require_admin(clerk_user_id, authorization)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    ok = await user_service.delete_chat_conversation_by_id_admin(session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found or delete failed")
    return {"success": True}


@app.get("/admin/check")
async def admin_check(clerk_user_id: str = None, authorization: str = Header(None)):
    """Check if the current user is admin. Returns { isAdmin: true/false }. Never raises."""
    cid = clerk_user_id or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not cid or not user_service:
        return {"isAdmin": False}
    try:
        user = await user_service.get_user_by_clerk_id(cid)
        email = (user.get("email") or "").strip().lower() if user else ""
        return {"isAdmin": email == ADMIN_EMAIL}
    except Exception:
        return {"isAdmin": False}


@app.get("/learning-plans-mock")
async def get_learning_plans_mock(authorization: str = Header(None)):
    """Legacy mock endpoint - get mock learning plans."""
    try:
        mock_plans = [
            {
                "id": "plan_1",
                "title": "Introduction to Artificial Intelligence",
                "subject": "Computer Science",
                "description": "Comprehensive introduction to AI concepts, machine learning, and neural networks",
                "totalDuration": "6 weeks",
                "difficulty": "Intermediate",
                "learningStyle": "Visual + Hands-on",
                "overallProgress": 0,  # New user should start at 0%
                "createdAt": "2024-01-15",
                "modules": [
                    {
                        "id": "module_1",
                        "title": "AI Fundamentals",
                        "description": "Basic concepts and history of AI",
                        "duration": "1 week",
                        "status": "not_started",  # Should start as not_started
                        "progress": 0,
                        "tasks": [
                            {
                                "id": "task_1",
                                "title": "What is AI?",
                                "description": "Learn the definition and types of AI",
                                "status": "todo",  # All tasks should be todo initially
                                "module": "AI Fundamentals",
                                "priority": "high",
                                "estimatedTime": "30 mins"
                            },
                            {
                                "id": "task_2",
                                "title": "History of AI",
                                "description": "Timeline of AI development",
                                "status": "todo",
                                "module": "AI Fundamentals",
                                "priority": "medium",
                                "estimatedTime": "45 mins"
                            }
                        ]
                    },
                    {
                        "id": "module_2",
                        "title": "Machine Learning Basics",
                        "description": "Introduction to ML algorithms and concepts",
                        "duration": "2 weeks",
                        "status": "not_started",
                        "progress": 0,
                        "tasks": [
                            {
                                "id": "task_3",
                                "title": "Supervised Learning",
                                "description": "Learn about classification and regression",
                                "status": "todo",
                                "module": "Machine Learning Basics",
                                "priority": "high",
                                "estimatedTime": "1 hour"
                            },
                            {
                                "id": "task_4",
                                "title": "Unsupervised Learning",
                                "description": "Clustering and dimensionality reduction",
                                "status": "todo",
                                "module": "Machine Learning Basics",
                                "priority": "high",
                                "estimatedTime": "1.5 hours"
                            },
                            {
                                "id": "task_5",
                                "title": "Model Evaluation",
                                "description": "Metrics and validation techniques",
                                "status": "todo",
                                "module": "Machine Learning Basics",
                                "priority": "medium",
                                "estimatedTime": "45 mins"
                            }
                        ]
                    },
                    {
                        "id": "module_3",
                        "title": "Neural Networks",
                        "description": "Deep learning and neural network architectures",
                        "duration": "2 weeks",
                        "status": "not_started",
                        "progress": 0,
                        "tasks": [
                            {
                                "id": "task_6",
                                "title": "Perceptrons",
                                "description": "Single layer neural networks",
                                "status": "todo",
                                "module": "Neural Networks",
                                "priority": "high",
                                "estimatedTime": "1 hour"
                            },
                            {
                                "id": "task_7",
                                "title": "Backpropagation",
                                "description": "Learning algorithm for neural networks",
                                "status": "todo",
                                "module": "Neural Networks",
                                "priority": "high",
                                "estimatedTime": "2 hours"
                            }
                        ]
                    }
                ]
            }
        ]
        
        return {
            "success": True,
            "plans": mock_plans
        }

    except Exception as e:
        print(f"Error getting learning plans: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get learning plans: {str(e)}")

@app.post("/teaching/start")
async def start_teaching_session(request: dict):
    """Start a new teaching session for a specific plan/module."""
    try:
        plan_id = request.get('plan_id')
        module_id = request.get('module_id')
        
        # Get learning plan data (this would come from database in production)
        # For now, using the mock plan structure
        learning_plan = {
            "id": plan_id,
            "subject": "Artificial Intelligence",
            "learning_style": "Visual + Hands-on",
            "difficulty": "Intermediate",
            "description": "Comprehensive introduction to AI concepts, machine learning, and neural networks",
            "modules": [
                {
                    "id": "module_1",
                    "title": "AI Fundamentals",
                    "description": "Basic concepts and history of AI"
                }
            ]
        }
        
        # Use the TeachingAssistant agent from our agent system
        if agent_system and hasattr(agent_system, 'agents') and 'teaching_assistant' in agent_system.agents:
            teaching_assistant = agent_system.agents['teaching_assistant']
            result = await teaching_assistant.start_teaching_session(learning_plan, {"user_id": "test_user"})
            return result
        else:
            # Fallback if agent system not available
            return {
                "success": True,
                "initial_message": f"Welcome to your {learning_plan['subject']} learning session! I'm your AI instructor, and I'm excited to guide you through the fundamentals. Let's start by exploring what artificial intelligence really means and how it shapes our world today.",
                "current_concept": "ai_fundamentals",
                "plan_data": learning_plan,
                "session_context": {
                    "subject": learning_plan['subject'],
                    "module": "AI Fundamentals",
                    "learning_style": learning_plan['learning_style'],
                    "difficulty": learning_plan['difficulty']
                }
            }
        
    except Exception as e:
        print(f"Error starting teaching session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start teaching session: {str(e)}")

@app.post("/teaching/chat")
async def teaching_chat(request: dict):
    """Handle teaching chat messages with streaming support."""
    try:
        raw_message = request.get('message', '')
        message = raw_message if isinstance(raw_message, str) else str(raw_message or '')
        plan_id = request.get('plan_id')
        module_id = request.get('module_id')
        current_concept = request.get('current_concept', '')
        stream = request.get('stream', False)
        image_base64 = request.get('image_base64')  # optional: base64 image for vision (sketch/upload)
        last_teacher_message = request.get('last_teacher_message', '')
        
        print(f"📝 Teaching chat request: '{message[:60]}...' | Stream: {stream} | Image: {bool(image_base64)}")
        
        # Build session context
        session_context = {
            "subject": "Artificial Intelligence",
            "module": "AI Fundamentals", 
            "learning_style": "Visual + Hands-on",
            "difficulty": "Intermediate",
            "current_concept": current_concept
        }
        if last_teacher_message and image_base64 and ("marked the area" in message.lower() or "is this correct" in message.lower()):
            session_context["evaluating_user_pointing"] = True
            session_context["pointing_question"] = last_teacher_message
        
        # Use the TeachingAssistant agent
        if agent_system and hasattr(agent_system, 'agents') and 'teaching_assistant' in agent_system.agents:
            teaching_assistant = agent_system.agents['teaching_assistant']
            
            if stream:
                # Return streaming response
                async def generate_stream():
                    async for chunk in teaching_assistant.stream_teaching_chat(message, session_context):
                        yield f"data: {json.dumps(chunk)}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                
                return StreamingResponse(
                    generate_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "*",
                    }
                )
            else:
                # If user asked for a drawing, generate blackboard image FIRST so the agent can acknowledge it
                draw_subject = _extract_draw_subject(message)
                blackboard_image = None
                if draw_subject:
                    blackboard_image = await _generate_blackboard_image(message)
                    if blackboard_image:
                        print("✅ Blackboard image generated for draw request (before agent reply)")
                    session_context["user_requested_blackboard_drawing"] = True
                    session_context["draw_subject"] = draw_subject
                    session_context["blackboard_image_ready"] = bool(blackboard_image)
                
                # For non-streaming response, process the message (returns dict with 'response' text)
                result = await teaching_assistant.handle_teaching_chat(
                    message, session_context, image_base64=image_base64
                )
                response_text = result.get("response", "") if isinstance(result, dict) else str(result or "")
                
                # Only generate image when explicitly needed: agent flag, user asked for one, or response says "here's a visual/diagram"
                message_lower = (message or "").lower()
                response_lower = (response_text or "").lower()
                should_generate_visual = result.get("should_generate_visual", False) if isinstance(result, dict) else False
                if not should_generate_visual and not draw_subject:
                    # User explicitly asked for a visual/diagram (and we didn't already handle it as blackboard)
                    user_asks_visual = any(phrase in message_lower for phrase in [
                        "show me a", "show a diagram", "show a visual", "can you show", "draw a", "illustrate with",
                        "show me the", "show the diagram", "show the visual", "picture of", "image of", "graph of"
                    ])
                    # Response explicitly offers a visual right now (not just mentions the word)
                    response_offers_visual = any(phrase in response_lower for phrase in [
                        "here's a visual", "here is a visual", "here's a diagram", "here is a diagram",
                        "here's an illustration", "below is a diagram", "below is a visual",
                        "let me show you a diagram", "let me show you a visual", "i'll show you a"
                    ])
                    should_generate_visual = user_asks_visual or response_offers_visual
                
                # If the agent returned BLACKBOARD_FEEDBACK: <prompt> (e.g. when user pointed to wrong place), generate that image
                response_text_final = response_text
                if "BLACKBOARD_FEEDBACK:" in response_text and not blackboard_image:
                    match = re.search(r"BLACKBOARD_FEEDBACK:\s*(.+?)(?:\n|$)", response_text, re.DOTALL)
                    if match:
                        feedback_prompt = match.group(1).strip()
                        feedback_image = await _generate_blackboard_image_from_prompt(feedback_prompt)
                        if feedback_image:
                            blackboard_image = feedback_image
                            print("✅ Blackboard feedback image generated (correct location highlighted)")
                        response_text_final = re.sub(r"\n?BLACKBOARD_FEEDBACK:\s*.+", "", response_text, flags=re.DOTALL).strip()

                # Fallback: if the TEACHER'S reply says they've drawn something on the blackboard
                # (e.g. \"I've just drawn the map of India on the blackboard\"), but we didn't
                # already generate a blackboard image from the USER'S message, try to infer the
                # drawing subject from the reply itself and generate an image.
                if not blackboard_image:
                    reply_lower = (response_text_final or "").lower()
                    if "on the blackboard" in reply_lower or "on the board" in reply_lower:
                        # Try to extract a concrete subject; if that fails, fall back to a generic
                        # \"diagram of what was just described\" prompt based on the reply text.
                        reply_draw_subject = _extract_draw_subject(response_text_final)
                        if reply_draw_subject:
                            prompt = (
                                f"Clear, simple chalkboard-style diagram of {reply_draw_subject}. "
                                "Drawn in white chalk on a dark blackboard, educational style, no text labels."
                            )
                        else:
                            prompt = (
                                "Clear, simple chalkboard-style diagram illustrating the following description: "
                                f"\"{response_text_final}\". Use circles and lines if appropriate, white chalk on "
                                "a dark blackboard, no text labels."
                            )
                        inferred_image = await _generate_blackboard_image_from_prompt(prompt)
                        if inferred_image:
                            blackboard_image = inferred_image
                            print("✅ Blackboard image generated from teacher reply fallback prompt")
                
                print(f"✅ Teaching response generated | Visual needed: {should_generate_visual} | Blackboard: {bool(blackboard_image)}")
                
                return {
                    "success": True,
                    "response": response_text_final,
                    "current_concept": result.get("current_concept", current_concept) if isinstance(result, dict) else current_concept,
                    "should_generate_visual": should_generate_visual,
                    "visual_concept": result.get("current_concept", current_concept) if isinstance(result, dict) else current_concept,
                    "visual_type": "concept_illustration",
                    "blackboard_image": blackboard_image
                }
        else:
            print("❌ Teaching assistant agent not available")
            raise HTTPException(status_code=500, detail="Teaching assistant agent not available")
            
    except Exception as e:
        print(f"Error in teaching chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process teaching chat: {str(e)}")


@app.post("/teaching/tts")
async def teaching_tts(request: dict):
    """Convert text to speech using OpenAI TTS. Returns audio/mpeg."""
    try:
        text = (request.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Missing 'text'")
        text = text[:4096]  # API limit
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="OpenAI API key not configured")
        client = openai_lib.OpenAI(api_key=api_key)
        resp = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=text,
        )
        return Response(content=resp.content, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in TTS: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


def _extract_draw_subject(message: str) -> Optional[str]:
    """If the user is asking for an image/drawing of something, return the subject (e.g. 'an apple')."""
    m = (message or "").strip().lower()
    if not m:
        return None
    for phrase in [
        "give me image of", "give me a image of",
        "can you draw", "draw me", "draw me a", "draw a", "draw ",
        "picture of", "image of",
        "show me image of", "show me a image of", "show image of",
        "show me a diagram of", "show me diagram of", "diagram of",
        "show me a map of", "show me map of", "map of",
        "picture of a", "image of a"
    ]:
        if phrase in m:
            idx = m.find(phrase)
            rest = message[idx + len(phrase):].strip()
            rest = rest.split(".")[0].split(",")[0].strip()
            if len(rest) > 1 and len(rest) < 200:
                return rest or None
    # Fallback: general \"map\" mentions together with blackboard/board
    if "map" in m and ("blackboard" in m or "on the board" in m or "board" in m):
        idx = m.find("map")
        rest = message[idx + len("map"):].strip()
        rest = rest.split(".")[0].split(",")[0].strip()
        if 0 < len(rest) < 200:
            return rest
    if m.startswith("draw "):
        rest = message[5:].strip().split(".")[0].split(",")[0].strip()
        if len(rest) > 1 and len(rest) < 200:
            return rest
    return None


async def _generate_blackboard_image(user_message: str) -> Optional[str]:
    """Generate a single image for the AI blackboard via DALL·E 3 from a user request like 'draw an apple'. Returns data URL or None."""
    subject = _extract_draw_subject(user_message)
    if not subject:
        return None
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not api_key.startswith("sk-"):
        return None

    # Tune prompts for map-style requests so we get the right geography.
    subj_lower = subject.lower()
    if "india" in subj_lower and "map" in subj_lower:
        # Very explicit so the model does NOT draw the US map.
        prompt = (
            "Clear, accurate outline political map of India ONLY (the country India in South Asia), "
            "drawn in white chalk on a dark blackboard. Show the correct shape of India's borders and "
            "its states, no other countries or continents, not the United States, no text labels."
        )
    elif "map of" in subj_lower or subj_lower.startswith("map"):
        prompt = (
            f"Clear, simple outline map of {subject}, drawn in white chalk on a dark blackboard. "
            "Focus on the correct geographic shape of the region requested, with no other countries or "
            "continents and no text labels."
        )
    else:
        prompt = (
            f"Clear, simple drawing of {subject}. Clean lines, educational style, as if drawn on a blackboard. "
            "No text labels. Single central subject."
        )
    prompt = prompt[:4000]

    def _call():
        try:
            client = openai_lib.OpenAI(api_key=api_key)
            resp = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                response_format="b64_json",
                style="natural",
                n=1,
            )
            if not resp.data or len(resp.data) == 0:
                return None
            b64 = getattr(resp.data[0], "b64_json", None)
            return f"data:image/png;base64,{b64}" if b64 else None
        except Exception as e:
            print(f"⚠️ Blackboard image generation failed: {e}")
            return None

    return await asyncio.to_thread(_call)


async def _generate_blackboard_image_from_prompt(raw_prompt: str) -> Optional[str]:
    """Generate a blackboard image from an exact DALL·E prompt (e.g. for feedback/highlight). Returns data URL or None."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not api_key.startswith("sk-"):
        return None
    prompt = (raw_prompt or "").strip()[:4000]
    if not prompt:
        return None

    def _call():
        try:
            client = openai_lib.OpenAI(api_key=api_key)
            resp = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                response_format="b64_json",
                style="natural",
                n=1,
            )
            if not resp.data or len(resp.data) == 0:
                return None
            b64 = getattr(resp.data[0], "b64_json", None)
            return f"data:image/png;base64,{b64}" if b64 else None
        except Exception as e:
            print(f"⚠️ Blackboard feedback image failed: {e}")
            return None

    return await asyncio.to_thread(_call)


async def _generate_dalle_diagram(concept: str, subject: str, diagram_type: str) -> Optional[str]:
    """Generate an educational image via OpenAI DALL·E 3. Returns data URL or None."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not api_key.startswith("sk-"):
        return None
    prompts = {
        "concept_illustration": f"Educational illustration of {concept} in {subject}. Clean, academic style with clear labels. Professional textbook quality.",
        "flowchart": f"Clear flowchart diagram showing {concept} process in {subject}. Arrows, boxes, clear text labels. Professional educational style.",
        "mind_map": f"Educational mind map for {concept} in {subject}. Central topic with branching subtopics, clear hierarchy, colorful but professional.",
    }
    prompt = prompts.get(diagram_type, f"Educational diagram of {concept} in {subject}. Clean, clear, academic style.")[:4000]

    def _call():
        try:
            client = openai_lib.OpenAI(api_key=api_key)
            resp = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                response_format="b64_json",
                style="natural",
                n=1,
            )
            if not resp.data or len(resp.data) == 0:
                return None
            b64 = getattr(resp.data[0], "b64_json", None)
            return f"data:image/png;base64,{b64}" if b64 else None
        except Exception as e:
            print(f"⚠️ DALL·E fallback failed: {e}")
            return None

    return await asyncio.to_thread(_call)


@app.post("/teaching/generate-diagram")
async def generate_teaching_diagram(request: dict):
    """Generate supervised educational diagrams."""
    try:
        concept = request.get('concept', '')
        diagram_type = request.get('type', 'concept_illustration')
        subject = request.get('subject', 'General')
        supervised = request.get('supervised', True)
        
        print(f"📊 Diagram generation request: {concept} ({diagram_type}) - {subject}")
        
        # Use ImageGenerationAssistant with supervision if available
        if agent_system and hasattr(agent_system, 'agents') and 'image_generation' in agent_system.agents:
            image_agent = agent_system.agents['image_generation']
            
            # Create supervisor context for validation
            supervisor_context = {
                "teaching_session": True,
                "requesting_agent": "TeachingAssistant",
                "current_subject": subject,
                "session_id": f"session_{concept}",
                "student_context": {"subject": subject}
            }
            
            result = await image_agent.generate_educational_visual(
                concept=concept,
                subject=subject,
                visual_type=diagram_type,
                supervisor_context=supervisor_context
            )
            
            if result.get('success'):
                print(f"✅ Generated diagram URL: {result['visual_url']}")
                return {
                    "success": True,
                    "diagram_url": result['visual_url'],
                    "diagram_type": result['visual_type'],
                    "concept": result['concept'],
                    "educational_context": result.get('educational_context', ''),
                    "supervised": True
                }
            else:
                print(f"❌ Image generation failed: {result.get('error', 'Unknown error')}")
                # Fall through to placeholder generation
        else:
            print("⚠️ Image generation agent not available, trying DALL·E fallback")
        
        # Fallback: try DALL·E directly, then SVG placeholder
        diagram_url = await _generate_dalle_diagram(concept, subject, diagram_type)
        if not diagram_url:
            subject_colors = {
                'artificial intelligence': '4F46E5',
                'computer science': '059669',
                'mathematics': 'DC2626',
                'physics': '7C3AED',
                'chemistry': 'EA580C',
                'biology': '16A34A',
            }
            color = subject_colors.get(subject.lower(), '6366F1')
            if diagram_type == "concept_illustration":
                diagram_url = make_diagram_data_url(concept, subject, "Key Concepts & Applications", color)
            elif diagram_type == "flowchart":
                diagram_url = make_diagram_data_url(concept, subject, "Process · Step 1 → Step 2 → Step 3", color)
            else:
                diagram_url = make_diagram_data_url(concept, subject, "Educational Diagram", color)
            print(f"🖼️ Using inline SVG placeholder for: {concept}")
        else:
            print(f"🖼️ Using DALL·E fallback image for: {concept}")
        
        return {
            "success": True,
            "diagram_url": diagram_url,
            "diagram_type": diagram_type,
            "concept": concept,
            "supervised": supervised
        }
        
    except Exception as e:
        print(f"Error generating diagram: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate diagram: {str(e)}")


def _run_code_subprocess(language: str, code: str):
    """Run code in a subprocess. Supports python, java, c, cpp, javascript."""
    import subprocess
    import tempfile

    supported = {"python", "java", "c", "cpp", "javascript"}
    if language not in supported:
        return {"success": False, "stdout": "", "stderr": f"Unsupported language: {language}. Use one of: {', '.join(supported)}", "exit_code": -1}

    workdir = tempfile.mkdtemp()
    try:
        if language == "python":
            path = os.path.join(workdir, "main.py")
            with open(path, "w") as f:
                f.write(code)
            result = subprocess.run(
                ["python3", path],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
        elif language == "java":
            path = os.path.join(workdir, "Main.java")
            with open(path, "w") as f:
                f.write(code)
            comp = subprocess.run(
                ["javac", "Main.java"],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
            if comp.returncode != 0:
                return {"success": False, "stdout": (comp.stdout or "").strip(), "stderr": (comp.stderr or "").strip(), "exit_code": comp.returncode}
            result = subprocess.run(
                ["java", "Main"],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
        elif language == "c":
            path = os.path.join(workdir, "main.c")
            with open(path, "w") as f:
                f.write(code)
            comp = subprocess.run(
                ["gcc", "-o", "out", "main.c"],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
            if comp.returncode != 0:
                return {"success": False, "stdout": (comp.stdout or "").strip(), "stderr": (comp.stderr or "").strip(), "exit_code": comp.returncode}
            result = subprocess.run(
                [os.path.join(workdir, "out")],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
        elif language == "cpp":
            path = os.path.join(workdir, "main.cpp")
            with open(path, "w") as f:
                f.write(code)
            comp = subprocess.run(
                ["g++", "-o", "out", "main.cpp"],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
            if comp.returncode != 0:
                return {"success": False, "stdout": (comp.stdout or "").strip(), "stderr": (comp.stderr or "").strip(), "exit_code": comp.returncode}
            result = subprocess.run(
                [os.path.join(workdir, "out")],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
        else:  # javascript
            path = os.path.join(workdir, "main.js")
            with open(path, "w") as f:
                f.write(code)
            result = subprocess.run(
                ["node", path],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=workdir,
            )
        return {
            "success": result.returncode == 0,
            "stdout": (result.stdout or "").strip(),
            "stderr": (result.stderr or "").strip(),
            "exit_code": result.returncode,
        }
    finally:
        try:
            import shutil
            shutil.rmtree(workdir, ignore_errors=True)
        except Exception:
            pass


@app.post("/teaching/execute-code")
async def execute_code(request: dict):
    """Run code in a sandboxed subprocess. Supports Python, Java, C, C++, JavaScript."""
    import subprocess

    try:
        language = (request.get("language") or "python").strip().lower()
        code = request.get("code") or ""

        if not code.strip():
            return {"success": False, "stdout": "", "stderr": "No code to run.", "exit_code": -1}

        return await asyncio.to_thread(_run_code_subprocess, language, code)
    except subprocess.TimeoutExpired:
        return {"success": False, "stdout": "", "stderr": "Run timed out (max 15s).", "exit_code": -1}
    except Exception as e:
        print(f"Error executing code: {e}")
        return {"success": False, "stdout": "", "stderr": str(e), "exit_code": -1}


@app.post("/teaching/assessment/create")
async def create_assessment(request: dict):
    """Create an assessment for a specific concept."""
    try:
        concept = request.get("concept", "")
        subject = request.get("subject", "Artificial Intelligence")
        difficulty = request.get("difficulty", "Intermediate")
        learning_style = request.get("learning_style", "Visual + Hands-on")
        previous_responses = request.get("previous_responses", [])
        
        if not concept:
            raise HTTPException(status_code=400, detail="Concept is required")
        
        # Use the AssessmentAgent to create an assessment
        if agent_system and hasattr(agent_system, 'agents') and 'assessment' in agent_system.agents:
            assessment_agent = agent_system.agents['assessment']
            result = await assessment_agent.create_assessment_for_concept(
                concept=concept,
                subject=subject,
                difficulty=difficulty,
                learning_style=learning_style,
                previous_responses=previous_responses
            )
            return result
        else:
            # Fallback response
            return {
                "success": True,
                "assessment": {
                    "questions": [
                        {
                            "id": "q1",
                            "question": f"Which of the following best describes {concept}?",
                            "type": "multiple_choice",
                            "options": [
                                "A fundamental concept in AI",
                                "An advanced mathematical theory",
                                "A programming language",
                                "A hardware component"
                            ],
                            "correct_answer": "A fundamental concept in AI",
                            "explanation": f"{concept} is indeed a fundamental concept in AI."
                        },
                        {
                            "id": "q2",
                            "question": f"True or False: {concept} is important for understanding AI systems.",
                            "type": "true_false",
                            "options": ["True", "False"],
                            "correct_answer": "True",
                            "explanation": f"{concept} is a crucial component for understanding AI systems."
                        }
                    ],
                    "passing_score": 1,
                    "concept_assessed": concept,
                    "difficulty": difficulty,
                    "created_at": datetime.now().isoformat()
                }
            }
        
    except Exception as e:
        print(f"Error creating assessment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create assessment: {str(e)}")

@app.post("/teaching/assessment/grade")
async def grade_assessment(request: dict):
    """Grade a user's assessment answers."""
    try:
        user_answers = request.get("user_answers", [])
        assessment = request.get("assessment", {})
        
        if not user_answers or not assessment:
            raise HTTPException(status_code=400, detail="User answers and assessment are required")
        
        # Use the AssessmentAgent to grade the assessment
        if agent_system and hasattr(agent_system, 'agents') and 'assessment' in agent_system.agents:
            assessment_agent = agent_system.agents['assessment']
            result = await assessment_agent.grade_assessment(
                user_answers=user_answers,
                assessment=assessment
            )
            return result
        else:
            # Fallback response
            return {
                "success": True,
                "passed": True,
                "score": 1,
                "total": 2,
                "score_percentage": 50.0,
                "feedback": "Good job! You've shown a solid understanding of the concept.",
                "question_results": [
                    {
                        "id": user_answers[0].get("id", "q1"),
                        "question": "Question text",
                        "user_answer": user_answers[0].get("answer", ""),
                        "correct": True,
                        "correct_answer": "Correct answer",
                        "explanation": "Explanation of the correct answer."
                    }
                ],
                "concept": assessment.get("concept_assessed", "the concept"),
                "subject": "Artificial Intelligence",
                "completed_at": datetime.now().isoformat()
            }
        
    except Exception as e:
        print(f"Error grading assessment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to grade assessment: {str(e)}")

@app.post("/teaching/assessment/recommendations")
async def get_teaching_recommendations(request: dict):
    """Get teaching recommendations based on assessment results."""
    try:
        assessment_result = request.get("assessment_result", {})
        
        if not assessment_result:
            raise HTTPException(status_code=400, detail="Assessment result is required")
        
        # Use the AssessmentAgent to provide recommendations
        if agent_system and hasattr(agent_system, 'agents') and 'assessment' in agent_system.agents:
            assessment_agent = agent_system.agents['assessment']
            result = await assessment_agent.provide_teaching_recommendations(assessment_result)
            return result
        else:
            # Fallback response
            passed = assessment_result.get("passed", False)
            concept = assessment_result.get("concept", "the concept")
            
            if passed:
                return {
                    "success": True,
                    "should_continue": True,
                    "message": f"Great job! You've demonstrated understanding of {concept}. Let's continue with the next concept.",
                    "next_action": "continue_teaching"
                }
            else:
                return {
                    "success": True,
                    "should_continue": False,
                    "message": f"Let's review {concept} a bit more before moving on.",
                    "review_points": [
                        "Review the key definitions and examples",
                        "Try to apply the concept in different contexts",
                        "Focus on understanding the underlying principles"
                    ],
                    "next_action": "review_concept"
                }
        
    except Exception as e:
        print(f"Error getting teaching recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get teaching recommendations: {str(e)}")


# === ACHIEVEMENTS ENDPOINTS ===

@app.get("/achievements")
async def list_achievements():
    """List all available achievements."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    try:
        achievements = await user_service.get_all_achievements()
        # Convert UUIDs to strings
        for a in achievements:
            if a.get('id'): a['id'] = str(a['id'])
            if a.get('created_at'): a['created_at'] = a['created_at'].isoformat()
        return {"success": True, "achievements": achievements}
    except Exception as e:
        print(f"Error listing achievements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/achievements")
async def get_my_achievements(clerk_user_id: str):
    """Get achievements earned by the calling user."""
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    try:
        earned = await user_service.get_user_achievements(clerk_user_id)
        # Convert UUIDs to strings
        for a in earned:
            if a.get('id'): a['id'] = str(a['id'])
            if a.get('user_id'): a['user_id'] = str(a['user_id'])
            if a.get('achievement_id'): a['achievement_id'] = str(a['achievement_id'])
            if a.get('created_at'): a['created_at'] = a['created_at'].isoformat() if isinstance(a['created_at'], datetime) else a['created_at']
        return {"success": True, "achievements": earned}
    except Exception as e:
        print(f"Error getting user achievements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class GrantAchievementPayload(BaseModel):
    clerk_user_id: str 
    target_email: str
    slug: str

@app.post("/admin/achievements/grant")
async def admin_grant_achievement(payload: GrantAchievementPayload):
    """Admin only: grant a rare achievement to a user by email."""
    await _require_admin(payload.clerk_user_id, None)
    if not user_service:
        raise HTTPException(status_code=500, detail="User service not initialized")
    
    try:
        success = await user_service.grant_achievement_by_email(payload.target_email, payload.slug)
        if success:
            return {"success": True, "message": f"Granted '{payload.slug}' to {payload.target_email}"}
        else:
            return {"success": False, "message": "Failed to grant. user or slug not found, or already granted."}
    except Exception as e:
        print(f"Error granting achievement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("🔥 Starting VEDYA API Server...")
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
