#!/usr/bin/env python3
"""
VEDYA Mock API Server for local UI testing.
Returns realistic fake responses for all frontend-facing endpoints.
No real API keys, DB, or AI models required.
"""

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import asyncio, json, uuid
from datetime import datetime, timezone

app = FastAPI(title="VEDYA Mock API", version="1.0.0-mock")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── helpers ────────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()

MOCK_USER_ID = "mock_user_001"
MOCK_PLAN_ID = "plan-mock-001"
MOCK_SESSION_ID = "sess-mock-001"

# In-memory state for demo UX continuity
_chat_sessions: dict = {}
_learning_plans: dict = {
    MOCK_PLAN_ID: {
        "id": MOCK_PLAN_ID,
        "clerk_user_id": MOCK_USER_ID,
        "title": "Python Fundamentals",
        "subject": "Python",
        "topics": ["Variables & Types", "Control Flow", "Functions", "OOP", "File I/O"],
        "current_topic_index": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
}
_chat_messages: dict = {
    MOCK_SESSION_ID: [
        {"id": "msg-1", "session_id": MOCK_SESSION_ID, "role": "assistant",
         "content": "Welcome to VEDYA! I'm your AI tutor. What would you like to learn today?",
         "timestamp": now_iso()},
    ]
}

# ── health ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "VEDYA Mock API is running", "status": "healthy", "mock": True, "timestamp": now_iso()}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agent_system": "mock", "mock": True, "timestamp": now_iso()}

# ── users ──────────────────────────────────────────────────────────────────

@app.post("/users/register")
async def register_user(req: Request):
    body = await req.json()
    return {
        "id": MOCK_USER_ID,
        "clerk_user_id": body.get("clerk_user_id", MOCK_USER_ID),
        "email": body.get("email", "demo@vedya.ai"),
        "full_name": body.get("full_name", "Demo User"),
        "subscription_tier": "freemium",
        "created_at": now_iso(),
    }

@app.get("/users/clerk/{clerk_id}")
async def get_user_by_clerk(clerk_id: str):
    return {
        "id": MOCK_USER_ID,
        "clerk_user_id": clerk_id,
        "email": "demo@vedya.ai",
        "full_name": "Demo User",
        "subscription_tier": "freemium",
        "onboarding_completed": True,
    }

@app.get("/users/freemium-status")
async def freemium_status(clerk_user_id: str = ""):
    return {
        "tier": "freemium",
        "session_hours_used": 1.5,
        "session_hours_limit": 5,
        "subjects_accessed": ["Python"],
        "subject_limit": 3,
        "can_start_session": True,
        "can_access_subject": True,
    }

@app.post("/users/session-end")
async def session_end(req: Request):
    return {"status": "ok"}

@app.get("/users/onboarding-status")
async def onboarding_status(clerk_user_id: str = ""):
    return {"completed": True, "step": "done"}

@app.get("/users/onboarding-data")
async def onboarding_data(clerk_user_id: str = ""):
    return {
        "full_name": "Demo User",
        "desired_topic": "Python",
        "educational_status": "Bachelor's Degree",
        "country": "India",
    }

@app.post("/users/onboarding")
async def save_onboarding(req: Request):
    return {"status": "saved"}

@app.get("/users/product-context")
async def product_context(clerk_user_id: str = ""):
    return {"product_type": "school", "org_id": None}

# ── chat ───────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: Request):
    body = await req.json()
    session_id = body.get("session_id") or MOCK_SESSION_ID
    user_msg = body.get("message", "")

    reply = f"[Mock AI] You asked: '{user_msg}'. In a real session, VEDYA's AI would provide a detailed, personalized answer. This is the mock server for UI testing."

    if session_id not in _chat_messages:
        _chat_messages[session_id] = []
    _chat_messages[session_id].append({"id": str(uuid.uuid4()), "session_id": session_id, "role": "user", "content": user_msg, "timestamp": now_iso()})
    _chat_messages[session_id].append({"id": str(uuid.uuid4()), "session_id": session_id, "role": "assistant", "content": reply, "timestamp": now_iso()})

    return {"response": reply, "session_id": session_id, "timestamp": now_iso()}

@app.post("/chat/stream")
async def chat_stream(req: Request):
    body = await req.json()
    user_msg = body.get("message", "")
    session_id = body.get("session_id") or MOCK_SESSION_ID

    words = f"[Mock AI streaming] You asked: '{user_msg}'. VEDYA would stream a thoughtful, personalized response here. This is a mock stream for UI testing.".split()

    async def generate():
        for word in words:
            chunk = {"token": word + " ", "session_id": session_id}
            yield f"data: {json.dumps(chunk)}\n\n"
            await asyncio.sleep(0.05)
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/chat/sessions")
async def list_chat_sessions(clerk_user_id: str = ""):
    return [
        {
            "session_id": MOCK_SESSION_ID,
            "clerk_user_id": clerk_user_id or MOCK_USER_ID,
            "subject": "Python",
            "created_at": now_iso(),
            "last_message": "Welcome to VEDYA!",
        }
    ]

@app.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, clerk_user_id: str = ""):
    _chat_messages.pop(session_id, None)
    return {"status": "deleted"}

@app.get("/chat/messages")
async def get_messages(session_id: str = ""):
    return _chat_messages.get(session_id, _chat_messages.get(MOCK_SESSION_ID, []))

# ── learning plans ─────────────────────────────────────────────────────────

@app.get("/learning-plans")
async def list_learning_plans(clerk_user_id: str = ""):
    return list(_learning_plans.values())

@app.get("/learning-plans/check")
async def check_learning_plan(clerk_user_id: str = ""):
    return {"has_plan": True, "plan_id": MOCK_PLAN_ID}

@app.post("/learning-plans")
async def create_learning_plan(req: Request):
    body = await req.json()
    plan_id = str(uuid.uuid4())
    plan = {"id": plan_id, "created_at": now_iso(), **body}
    _learning_plans[plan_id] = plan
    return plan

@app.get("/learning-plans/{plan_id}")
async def get_learning_plan(plan_id: str, clerk_user_id: str = ""):
    return _learning_plans.get(plan_id, _learning_plans.get(MOCK_PLAN_ID))

@app.delete("/learning-plans/{plan_id}")
async def delete_learning_plan(plan_id: str, clerk_user_id: str = ""):
    _learning_plans.pop(plan_id, None)
    return {"status": "deleted"}

@app.get("/learning-plans/{plan_id}/progress")
async def get_plan_progress(plan_id: str, clerk_user_id: str = ""):
    return {"plan_id": plan_id, "completed_topics": 1, "total_topics": 5, "percent": 20}

@app.post("/learning-plans/from-session")
async def save_plan_from_session(req: Request):
    plan_id = str(uuid.uuid4())
    plan = {"id": plan_id, "title": "Saved from session", "created_at": now_iso()}
    _learning_plans[plan_id] = plan
    return plan

@app.post("/generate_learning_plan")
async def generate_plan(req: Request):
    return {
        "plan": {
            "title": "Python Fundamentals",
            "topics": ["Variables & Types", "Control Flow", "Functions", "OOP", "File I/O"],
            "duration_weeks": 4,
        },
        "session_id": MOCK_SESSION_ID,
        "plan_ready": True,
    }

# ── teaching ───────────────────────────────────────────────────────────────

@app.post("/teaching/start")
async def teaching_start(req: Request):
    return {
        "session_id": str(uuid.uuid4()),
        "greeting": "[Mock] Welcome to your teaching session! I'll guide you through the topic step by step.",
        "topic": "Python Basics",
    }

@app.post("/teaching/chat")
async def teaching_chat(req: Request):
    body = await req.json()
    msg = body.get("message", "")
    return {
        "response": f"[Mock Tutor] Great question about '{msg}'! Here is a mock explanation with example code:\n\n```python\n# Example\nx = 42\nprint(x)\n```\n\nThis demonstrates the concept. Ask me anything!",
        "session_id": body.get("session_id", MOCK_SESSION_ID),
        "timestamp": now_iso(),
    }

@app.post("/teaching/tts")
async def teaching_tts(req: Request):
    # Return empty audio bytes — browser will silently fail gracefully
    return JSONResponse({"audio_url": None, "message": "TTS mocked — no audio in mock mode"})

@app.post("/teaching/generate-diagram")
async def generate_diagram(req: Request):
    return {
        "diagram_url": None,
        "diagram_type": "mock",
        "message": "Diagram generation mocked. In production this returns an Excalidraw diagram.",
    }

@app.post("/teaching/explain-annotation")
async def explain_annotation(req: Request):
    body = await req.json()
    return {"explanation": f"[Mock] Annotation explanation for: {body.get('annotation', 'selected area')}"}

@app.post("/teaching/execute-code")
async def execute_code(req: Request):
    body = await req.json()
    code = body.get("code", "")
    return {
        "output": f"[Mock output]\n>>> {code[:60]}...\nCode executed successfully (mock). Output would appear here.",
        "error": None,
    }

# ── sessions / blackboard ──────────────────────────────────────────────────

@app.get("/sessions/{session_id}/blackboard")
async def get_blackboard(session_id: str):
    return {"session_id": session_id, "strokes": [], "annotations": []}

@app.get("/users/blackboards")
async def get_user_blackboards(clerk_user_id: str = ""):
    return []

# ── orgs ───────────────────────────────────────────────────────────────────

@app.post("/orgs/register")
async def register_org(req: Request):
    body = await req.json()
    return {
        "org_id": str(uuid.uuid4()),
        "name": body.get("name", "Demo Org"),
        "product_type": body.get("product_type", "school"),
        "created_at": now_iso(),
    }

@app.post("/orgs/invite")
async def invite_to_org(req: Request):
    return {"status": "invited", "message": "Invite sent (mocked)"}

@app.get("/orgs/me")
async def get_my_org(clerk_user_id: str = ""):
    return {"org": None, "role": None}

# ── settings ───────────────────────────────────────────────────────────────

@app.get("/settings/plan-ready-message")
async def plan_ready_message():
    return {"message": "Your learning plan is ready! Click below to start."}

# ── admin ──────────────────────────────────────────────────────────────────

@app.get("/admin/check")
async def admin_check(clerk_user_id: str = ""):
    return {"is_admin": False}

@app.get("/admin/users")
async def admin_users(clerk_user_id: str = ""):
    return []

@app.get("/admin/learning-plans")
async def admin_learning_plans(clerk_user_id: str = ""):
    return []

@app.get("/admin/chat-sessions")
async def admin_chat_sessions(clerk_user_id: str = ""):
    return []

@app.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, clerk_user_id: str = ""):
    return {"status": "deleted"}

@app.delete("/admin/learning-plans/{plan_id}")
async def admin_delete_learning_plan(plan_id: str, clerk_user_id: str = ""):
    return {"status": "deleted"}

@app.delete("/admin/chat-sessions/{session_id}")
async def admin_delete_chat_session(session_id: str, clerk_user_id: str = ""):
    return {"status": "deleted"}

# ── live sessions ──────────────────────────────────────────────────────────

@app.get("/live/current")
async def live_current():
    return {"session": None, "is_live": False}

@app.post("/admin/live/start")
async def admin_live_start(req: Request):
    return {"session_id": str(uuid.uuid4()), "started_at": now_iso()}

@app.post("/admin/live/stop")
async def admin_live_stop(req: Request):
    return {"status": "stopped"}

@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket, session_id: str = "", clerk_user_id: str = "", user_name: str = "", is_admin: bool = False):
    await websocket.accept()
    await websocket.send_json({"type": "connected", "message": f"[Mock WS] {user_name} joined session {session_id}"})
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "echo", "data": data, "mock": True})
    except WebSocketDisconnect:
        pass

# ── achievements ───────────────────────────────────────────────────────────

@app.get("/achievements")
async def list_achievements():
    return [
        {"id": "ach-1", "title": "First Steps", "description": "Complete your first lesson", "icon": "⭐"},
        {"id": "ach-2", "title": "Quick Learner", "description": "Complete 5 lessons", "icon": "🚀"},
        {"id": "ach-3", "title": "Python Pro", "description": "Master Python basics", "icon": "🐍"},
    ]

@app.get("/user/achievements")
async def user_achievements(clerk_user_id: str = ""):
    return [
        {"achievement_id": "ach-1", "unlocked_at": now_iso(), "title": "First Steps"},
    ]

@app.post("/admin/achievements/grant")
async def grant_achievement(req: Request):
    return {"status": "granted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
