#!/usr/bin/env python3
"""
VEDYA AI-Powered Conversational Planning Agent
"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from strict_env import get_required


class ConversationStage(Enum):
    INITIAL = "initial"
    GATHERING = "gathering"
    PLANNING = "planning"
    COMPLETE = "complete"

@dataclass
class UserProfile:
    raw_data: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.raw_data is None:
            self.raw_data = {}

@dataclass
class PlanningSession:
    session_id: str
    stage: ConversationStage
    profile: UserProfile
    conversation_history: List[Dict[str, str]] = None
    learning_plan: Optional[Dict[str, Any]] = None
    created_at: datetime = None
    updated_at: datetime = None
    
    def __post_init__(self):
        if self.conversation_history is None:
            self.conversation_history = []
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()

class AIPoweredPlanningAgent:
    def __init__(self):
        try:
            max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", 4000))
        except:
            max_tokens = 4000
            
        self.llm = ChatOpenAI(
            model="gpt-4",
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY") or (_ for _ in ()).throw(RuntimeError("OPENAI_API_KEY missing")),
            max_tokens=max_tokens
        )
        
        self.sessions: Dict[str, PlanningSession] = {}
    
    def get_or_create_session(self, session_id: Optional[str] = None) -> PlanningSession:
        if session_id and session_id in self.sessions:
            return self.sessions[session_id]
        
        new_session_id = session_id or str(uuid.uuid4())
        session = PlanningSession(
            session_id=new_session_id,
            stage=ConversationStage.INITIAL,
            profile=UserProfile()
        )
        self.sessions[new_session_id] = session
        return session
    
    async def process_message(
        self,
        message: str,
        session_id: Optional[str] = None,
        plan_ready_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self.get_or_create_session(session_id)
        session.updated_at = datetime.now()
        
        session.conversation_history.append({
            "sender": "user",
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
        if session.stage == ConversationStage.INITIAL:
            response = await self._handle_initial_conversation(session, message)
        elif session.stage == ConversationStage.GATHERING:
            response = await self._handle_requirements_gathering(session, message)
        elif session.stage == ConversationStage.PLANNING:
            response = await self._handle_plan_generation(session, message, plan_ready_message=plan_ready_message)
        else:
            response = await self._handle_complete_stage(session, message)
        
        session.conversation_history.append({
            "sender": "ai",
            "message": response["message"],
            "timestamp": datetime.now().isoformat()
        })
        
        return {
            "response": response["message"],
            "session_id": session.session_id,
            "stage": session.stage.value,
            "metadata": response.get("metadata", {}),
            "plan_ready": session.stage == ConversationStage.COMPLETE and session.learning_plan is not None
        }
    
    async def _handle_initial_conversation(self, session: PlanningSession, message: str) -> Dict[str, Any]:
        try:
            prompt = f"""You are VEDYA, a professional AI learning advisor. 

The user said: "{message}"

Respond naturally and professionally. If they mention a specific subject they want to learn, acknowledge it and ask about their experience level. If they don't mention a subject, ask what they'd like to learn.

Keep response conversational and under 100 words."""

            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            
            # Simple subject detection
            message_lower = message.lower()
            subject = None
            
            subjects = ["generative ai", "ai", "programming", "python", "javascript", "web development", 
                       "data science", "machine learning", "mathematics", "physics", "chemistry"]
            
            for subj in subjects:
                if subj in message_lower:
                    subject = subj
                    session.profile.raw_data["subject"] = subject
                    session.stage = ConversationStage.GATHERING
                    break
            
            return {
                "message": response.content,
                "metadata": {"subject_identified": subject}
            }
            
        except Exception as e:
            return {
                "message": "Hello! I'm here to help you create a personalized learning plan. What subject would you like to learn?",
                "metadata": {"error": str(e)}
            }
    
    async def _handle_requirements_gathering(self, session: PlanningSession, message: str) -> Dict[str, Any]:
        current_data = session.profile.raw_data
        
        try:
            prompt = f"""You are VEDYA gathering learning requirements.

Current info: {json.dumps(current_data)}
User said: "{message}"

Extract information about:
- Experience level (beginner/intermediate/advanced)
- Learning style (hands-on/visual/reading/mixed)  
- Time availability
- Goals

Ask for ONE missing requirement. Be conversational and professional.

If you have subject + 2 other requirements, say you're ready to create their plan."""

            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            
            # Simple requirement extraction
            message_lower = message.lower()
            
            if "beginner" in message_lower or "new" in message_lower:
                session.profile.raw_data["experience"] = "beginner"
            elif "intermediate" in message_lower:
                session.profile.raw_data["experience"] = "intermediate"
            elif "advanced" in message_lower:
                session.profile.raw_data["experience"] = "advanced"
                
            if "hands-on" in message_lower or "practice" in message_lower:
                session.profile.raw_data["learning_style"] = "hands-on"
            elif "visual" in message_lower:
                session.profile.raw_data["learning_style"] = "visual"
            elif "reading" in message_lower:
                session.profile.raw_data["learning_style"] = "reading"
            
            # Check if ready for planning
            if len(session.profile.raw_data) >= 3:
                session.stage = ConversationStage.PLANNING
                return await self._generate_learning_plan(session)
            
            return {
                "message": response.content,
                "metadata": {"requirements_gathered": session.profile.raw_data}
            }
            
        except Exception as e:
            return {
                "message": "Could you tell me about your experience level and learning preferences?",
                "metadata": {"error": str(e)}
            }
    
    async def _handle_plan_generation(
        self,
        session: PlanningSession,
        message: str,
        plan_ready_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self._generate_learning_plan(session, plan_ready_message=plan_ready_message)
    
    async def _generate_learning_plan(
        self,
        session: PlanningSession,
        plan_ready_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        requirements = session.profile.raw_data
        subject = requirements.get("subject", "the subject")
        
        # Create learning plan
        plan = {
            "plan_id": f"plan_{uuid.uuid4().hex[:8]}",
            "title": f"Personalized {subject.title()} Learning Plan",
            "description": f"A comprehensive plan to master {subject}",
            "subject": subject,
            "difficulty_level": requirements.get("experience", "beginner"),
            "learning_style": requirements.get("learning_style", "mixed"),
            "total_duration_weeks": 12,
            "modules": [
                {
                    "title": f"{subject.title()} Fundamentals",
                    "description": f"Core concepts and basics of {subject}",
                    "duration_weeks": 4,
                    "key_concepts": ["Basic terminology", "Core principles", "Essential tools"],
                    "activities": ["Interactive tutorials", "Practice exercises", "Quizzes"]
                },
                {
                    "title": f"Intermediate {subject.title()}",
                    "description": f"Building practical skills in {subject}",
                    "duration_weeks": 4,
                    "key_concepts": ["Advanced concepts", "Real applications", "Problem solving"],
                    "activities": ["Projects", "Case studies", "Hands-on practice"]
                },
                {
                    "title": f"Advanced {subject.title()} & Applications",
                    "description": f"Mastering {subject} and real-world applications",
                    "duration_weeks": 4,
                    "key_concepts": ["Expert techniques", "Industry practices", "Innovation"],
                    "activities": ["Capstone project", "Portfolio development", "Presentations"]
                }
            ],
            "kanban_tasks": [
                {
                    "task_id": f"task_{uuid.uuid4().hex[:8]}",
                    "title": "Complete Module 1: Fundamentals",
                    "description": f"Master the basics of {subject}",
                    "status": "todo",
                    "assigned_to": "Student",
                    "priority": "high",
                    "estimated_hours": 40
                },
                {
                    "task_id": f"task_{uuid.uuid4().hex[:8]}",
                    "title": "Complete Module 2: Intermediate Skills",
                    "description": f"Develop practical {subject} skills",
                    "status": "todo",
                    "assigned_to": "Student",
                    "priority": "medium",
                    "estimated_hours": 40
                },
                {
                    "task_id": f"task_{uuid.uuid4().hex[:8]}",
                    "title": "Complete Module 3: Advanced Applications",
                    "description": f"Master advanced {subject} concepts",
                    "status": "todo",
                    "assigned_to": "Student",
                    "priority": "medium",
                    "estimated_hours": 40
                }
            ],
            "prerequisites": [],
            "learning_outcomes": [
                f"Understand core {subject} concepts",
                f"Apply {subject} to solve real problems",
                f"Build projects using {subject}",
                f"Explain {subject} concepts to others"
            ]
        }
        
        session.learning_plan = plan
        session.stage = ConversationStage.COMPLETE
        
        # Clean, professional formatting without special characters
        message = f"Perfect! I've created your personalized learning plan for {subject}.\n\n"
        message += f"{plan['title']}\n"
        message += f"{plan['description']}\n\n"
        message += f"Duration: {plan['total_duration_weeks']} weeks\n"
        message += f"Difficulty: {plan['difficulty_level']}\n\n"
        
        message += "Learning Modules:\n"
        for i, module in enumerate(plan['modules'], 1):
            message += f"{i}. {module['title']} ({module['duration_weeks']} weeks)\n"
        
        message += "\nYour complete learning plan with syllabus and progress tracking is ready!\n\n"
        default_ready = "Ready to start learning? I can take you to your personalized dashboard where you'll see your full plan, progress tracking, and begin your first lesson."
        message += (plan_ready_message and plan_ready_message.strip()) or default_ready

        return {
            "message": message,
            "metadata": {
                "plan_generated": True, 
                "plan_id": plan["plan_id"],
                "show_action_button": True,
                "action_button_text": "View My Learning Plan",
                "action_type": "view_plan"
            }
        }
    
    async def _handle_complete_stage(self, session: PlanningSession, message: str) -> Dict[str, Any]:
        return {
            "message": "Your learning plan is complete! You can now start your learning journey.",
            "metadata": {"plan_complete": True}
        }
    
    def get_learning_plan(self, session_id: str) -> Optional[Dict[str, Any]]:
        if session_id in self.sessions:
            return self.sessions[session_id].learning_plan
        return None

# Global instance
ai_planning_agent = AIPoweredPlanningAgent()
