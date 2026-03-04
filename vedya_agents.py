#!/usr/bin/env python3
"""
VEDYA LangGraph Agent System
AI-Powered Education Platform using LangChain and LangGraph

This system implements a multi-agent workflow for personalized education
using state-of-the-art agentic patterns with LangChain and LangGraph.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, TypedDict, Annotated
import uuid

# Core imports
import openai
from strict_env import get_required  # Enforces strict .env loading on import

# LangChain imports
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# LangGraph imports  
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict

# Pydantic for structured outputs
from pydantic import BaseModel, Field
from datetime import datetime

# Data persistence
import sqlite3
import json

# Email service
from email_service import email_service

# strict_env already loaded .env; no further action needed


class LearningObjective(BaseModel):
    """Structured learning objective definition."""
    subject: str = Field(..., description="Subject to learn")
    learning_style: str = Field(..., description="Preferred learning style")
    difficulty: str = Field(..., description="Difficulty level")
    timeline: int = Field(..., description="Timeline in weeks")
    preferences: List[str] = Field(default=[], description="Learning preferences")


class LearningPlan(BaseModel):
    """Generated learning plan structure."""
    plan_id: str = Field(..., description="Unique plan identifier")
    user_id: str = Field(..., description="User identifier")
    objectives: LearningObjective
    modules: List[str] = Field(default=[], description="Learning modules")
    estimated_duration: int = Field(..., description="Estimated duration in weeks")
    content_items: List[str] = Field(default=[], description="Curated content")
    learning_path: str = Field(..., description="Customized learning path")
    created_at: datetime = Field(default_factory=datetime.now)


class KanbanTask(BaseModel):
    """Kanban board task structure."""
    task_id: str = Field(..., description="Unique task identifier")
    title: str = Field(..., description="Task title")
    status: str = Field(default="todo", description="Task status")
    assigned_agent: str = Field(..., description="Assigned agent")
    priority: str = Field(default="medium", description="Task priority")
    created_at: datetime = Field(default_factory=datetime.now)


class WorkflowState(TypedDict):
    """LangGraph workflow state definition."""
    messages: List[BaseMessage]
    learning_objective: Optional[Dict[str, Any]]
    learning_plan: Optional[Dict[str, Any]]
    kanban_tasks: List[Dict[str, Any]]
    current_agent: str
    workflow_stage: str
    thread_id: str
    completed_agents: List[str]
    next_action: str


class VEDYAAgent:
    """Base class for VEDYA agents."""
    
    def __init__(self, name: str, model: str = "o4-mini", temperature: float = 0.2):
        self.name = name
        self.model = model
        self.temperature = temperature
        # Read max tokens from env, fallback to 4000 if not set
        try:
            self.max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", 4000))
        except Exception:
            self.max_tokens = 4000
        self.llm = self._create_llm()

    def _create_llm(self):
        """Create appropriate LLM based on configuration."""
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        # Set default temperature for models that don't support custom temperatures
        # o4-mini only supports temperature=1.0
        temp_to_use = 1.0 if self.model == "o4-mini" else self.temperature

        if "gpt" in self.model or self.model.startswith("o4"):
            if not openai_key:
                raise RuntimeError("OPENAI_API_KEY is not set. Please add it to .env and restart the server.")
            return ChatOpenAI(
                model=self.model,
                temperature=temp_to_use,
                api_key=openai_key,
                max_tokens=self.max_tokens
            )
        elif "claude" in self.model:
            if not anthropic_key:
                raise RuntimeError("ANTHROPIC_API_KEY is not set. Please add it to .env and restart the server.")
            return ChatAnthropic(
                model=self.model,
                temperature=self.temperature,
                api_key=anthropic_key,
                max_tokens=self.max_tokens
            )
        else:
            # Fallback to OpenAI default model
            if not openai_key:
                raise RuntimeError("OPENAI_API_KEY is not set. Please add it to .env and restart the server.")
            # Use default temperature 1.0 for o4-mini
            return ChatOpenAI(
                model="o4-mini",
                temperature=1.0,
                api_key=openai_key,
                max_tokens=self.max_tokens
            )
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Execute agent logic (to be implemented by subclasses)."""
        raise NotImplementedError("Subclasses must implement execute method")


class SupervisorAgent(VEDYAAgent):
    """Supervisor agent that orchestrates the workflow."""
    
    def __init__(self):
        model = os.getenv("SUPERVISOR_AGENT_MODEL", "o4-mini")
        super().__init__("Supervisor", model, 0.1)
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Coordinate overall workflow."""
        messages = state["messages"]
        learning_objective = state.get("learning_objective")
        
        # Extract learning objective from user message
        if not learning_objective and messages:
            last_message = messages[-1]
            if isinstance(last_message, HumanMessage):
                user_input = last_message.content.lower()
                
                # Extract subject from user input
                subject = "General Learning"
                if "web development" in user_input or "web dev" in user_input:
                    subject = "Web Development"
                elif "programming" in user_input or "coding" in user_input:
                    subject = "Programming"
                elif "python" in user_input:
                    subject = "Python Programming"
                elif "javascript" in user_input or "js" in user_input:
                    subject = "JavaScript"
                elif "ai" in user_input or "artificial intelligence" in user_input or "machine learning" in user_input:
                    subject = "Artificial Intelligence"
                elif "data science" in user_input:
                    subject = "Data Science"
                elif "math" in user_input or "mathematics" in user_input:
                    subject = "Mathematics"
                elif "science" in user_input:
                    subject = "Science"
                else:
                    # Try to extract the main topic from the message
                    words = user_input.split()
                    for i, word in enumerate(words):
                        if word in ["learn", "study", "teach"] and i + 1 < len(words):
                            potential_subject = " ".join(words[i+1:i+3])
                            subject = potential_subject.title()
                            break
                
                # Determine learning style from input
                learning_style = "mixed"
                if "visual" in user_input or "watch" in user_input or "video" in user_input:
                    learning_style = "visual"
                elif "hands-on" in user_input or "practice" in user_input or "build" in user_input:
                    learning_style = "hands_on"
                elif "reading" in user_input or "text" in user_input or "book" in user_input:
                    learning_style = "reading"
                
                # Determine difficulty level
                difficulty = "beginner"
                if "advanced" in user_input or "expert" in user_input:
                    difficulty = "advanced"
                elif "intermediate" in user_input:
                    difficulty = "intermediate"
                elif "beginner" in user_input or "basic" in user_input or "start" in user_input:
                    difficulty = "beginner"
                
                learning_objective = {
                    "subject": subject,
                    "learning_style": learning_style,
                    "difficulty": difficulty,
                    "timeline": 12,
                    "preferences": ["interactive", learning_style]
                }
        
        # Create initial Kanban tasks
        tasks = [
            {
                "task_id": f"task_{uuid.uuid4().hex[:8]}",
                "title": "Create Learning Plan",
                "status": "in_progress",
                "assigned_agent": "Planner",
                "priority": "high"
            },
            {
                "task_id": f"task_{uuid.uuid4().hex[:8]}",
                "title": "Curate Content",
                "status": "todo",
                "assigned_agent": "ContentCurator",
                "priority": "high"
            }
        ]
        
        return {
            "learning_objective": learning_objective,
            "kanban_tasks": tasks,
            "current_agent": "Planner",
            "workflow_stage": "planning",
            "next_action": "plan"
        }


class PlannerAgent(VEDYAAgent):
    """Agent responsible for creating learning plans."""
    
    def __init__(self):
        model = os.getenv("PLANNER_AGENT_MODEL", "o4-mini")
        super().__init__("Planner", model, 0.2)
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Create structured learning plan."""
        learning_objective = state.get("learning_objective", {})
        
        # Create learning plan
        plan = LearningPlan(
            plan_id=f"plan_user_{uuid.uuid4().hex[:6]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            user_id=f"user_{uuid.uuid4().hex[:8]}",
            objectives=LearningObjective(**learning_objective),
            modules=["Introduction", "Core Concepts", "Advanced Topics"],
            estimated_duration=max(8, learning_objective.get("timeline", 12) - 2),
            content_items=["Interactive Tutorial", "Video Series", "Practice Exercises"],
            learning_path=f"{learning_objective.get('learning_style', 'mixed').title()} Learning Path"
        )
        
        # Update Kanban
        updated_tasks = []
        for task in state.get("kanban_tasks", []):
            if task["assigned_agent"] == "Planner":
                task["status"] = "completed"
            updated_tasks.append(task)
        
        return {
            "learning_plan": plan.model_dump(),
            "kanban_tasks": updated_tasks,
            "current_agent": "ContentCurator",
            "workflow_stage": "content_curation",
            "next_action": "curate_content",
            "completed_agents": state.get("completed_agents", []) + ["Planner"]
        }


class ContentCuratorAgent(VEDYAAgent):
    """Agent responsible for curating learning content."""
    
    def __init__(self):
        model = os.getenv("CONTENT_CURATOR_MODEL", "o4-mini")
        super().__init__("ContentCurator", model, 0.3)
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Curate relevant learning content."""
        learning_plan = state.get("learning_plan", {})
        learning_objective = state.get("learning_objective", {})
        
        # Mock content curation based on learning style
        learning_style = learning_objective.get("learning_style", "mixed")
        curated_content = []
        
        if learning_style == "visual":
            curated_content = [
                "Interactive Visualizations",
                "Infographic Series", 
                "Video Demonstrations"
            ]
        elif learning_style == "hands_on":
            curated_content = [
                "Coding Projects",
                "Laboratory Exercises",
                "Real-world Case Studies"
            ]
        else:
            curated_content = [
                "Research Papers",
                "Textbook Chapters",
                "Academic Articles"
            ]
        
        # Update learning plan with curated content
        if learning_plan:
            learning_plan["content_items"] = curated_content
        
        # Update Kanban
        updated_tasks = []
        for task in state.get("kanban_tasks", []):
            if task["assigned_agent"] == "ContentCurator":
                task["status"] = "completed"
            updated_tasks.append(task)
        
        return {
            "learning_plan": learning_plan,
            "kanban_tasks": updated_tasks,
            "current_agent": "AssessmentAgent",
            "workflow_stage": "assessment_creation",
            "next_action": "create_assessment",
            "completed_agents": state.get("completed_agents", []) + ["ContentCurator"]
        }


class AssessmentAgent(VEDYAAgent):
    """Agent responsible for creating assessments and evaluating user understanding."""
    
    def __init__(self):
        model = os.getenv("ASSESSMENT_AGENT_MODEL", "o4-mini")
        super().__init__("AssessmentAgent", model, 0.2)
        self.assessment_cache = {}  # In-memory cache for assessments; would be DB in production
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Create assessments and quizzes."""
        learning_plan = state.get("learning_plan", {})
        
        # Add assessment task to Kanban
        new_task = {
            "task_id": f"task_{uuid.uuid4().hex[:8]}",
            "title": "Create Assessment Quiz",
            "status": "completed",
            "assigned_agent": "AssessmentAgent",
            "priority": "medium"
        }
        
        updated_tasks = state.get("kanban_tasks", []) + [new_task]
        
        return {
            "learning_plan": learning_plan,
            "kanban_tasks": updated_tasks,
            "current_agent": "ManagerAgent",
            "workflow_stage": "coordination",
            "next_action": "coordinate",
            "completed_agents": state.get("completed_agents", []) + ["AssessmentAgent"]
        }
    
    async def create_assessment_for_concept(self, concept: str, subject: str, difficulty: str, 
                                       learning_style: str, previous_responses: List[str] = None) -> Dict[str, Any]:
        """Create an assessment quiz for a specific concept."""
        
        # Check cache first
        cache_key = f"{concept}_{subject}_{difficulty}"
        if cache_key in self.assessment_cache:
            return {
                "success": True,
                "assessment": self.assessment_cache[cache_key],
                "from_cache": True
            }
        
        # Build assessment prompt
        previous_context = ""
        if previous_responses and len(previous_responses) > 0:
            previous_context = "Previous teaching exchanges:\n\n" + "\n".join([
                f"- {resp[:100]}..." for resp in previous_responses[:3]
            ])

        system_prompt = f"""You are an expert Assessment Agent creating a meaningful quiz to evaluate student understanding of {concept} in {subject}.

CONTEXT:
- Student's Learning Style: {learning_style}
- Difficulty Level: {difficulty}
- Concept Being Assessed: {concept}
{previous_context}

ASSESSMENT DESIGN GUIDELINES:
1. Create exactly 3 questions that test comprehension of {concept}
2. Make questions progressively more challenging
3. Questions should be relevant to what was covered in the teaching session
4. Adapt question style to {learning_style} learners
5. Include a mix of question types (multiple choice, true/false, short answer)
6. Provide clear, informative feedback for each possible answer

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:
{{
  "questions": [
    {{
      "id": "q1",
      "question": "Question text here",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["Option A", "Option B", "Option C", "Option D"], 
      "correct_answer": "Correct option here or index",
      "explanation": "Explanation of the correct answer"
    }},
    ...
  ],
  "passing_score": 2,
  "concept_assessed": "{concept}",
  "difficulty": "{difficulty}"
}}

IMPORTANT:
- For multiple_choice questions, include 3-4 options, with exactly one correct answer
- For true_false questions, provide options ["True", "False"] and correct_answer should be "True" or "False"
- For short_answer questions, provide an empty options array [] and correct_answer should be a string with the expected answer
- Ensure the questions genuinely assess understanding, not just recall
- Target the questions to {difficulty} level"""

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Create an assessment for {concept} in {subject} at {difficulty} level")
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # Extract JSON from response
            response_text = response.content
            
            # Try to find JSON in the response
            import re
            import json
            
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON without code blocks
                json_match = re.search(r'({[\s\S]*})', response_text)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    json_str = response_text
            
            try:
                assessment = json.loads(json_str)
                
                # Ensure assessment has the correct structure
                if not isinstance(assessment, dict) or "questions" not in assessment:
                    raise ValueError("Invalid assessment structure")
                
                # Add assessment metadata
                assessment["concept"] = concept
                assessment["subject"] = subject
                assessment["difficulty"] = difficulty
                assessment["learning_style"] = learning_style
                assessment["created_at"] = datetime.now().isoformat()
                
                # Cache the assessment
                self.assessment_cache[cache_key] = assessment
                
                return {
                    "success": True,
                    "assessment": assessment
                }
                
            except json.JSONDecodeError:
                print(f"Error parsing assessment JSON: {json_str}")
                # Fallback to basic assessment
                fallback = self._create_fallback_assessment(concept, subject, difficulty)
                self.assessment_cache[cache_key] = fallback
                return {
                    "success": False,
                    "error": "Failed to parse assessment JSON",
                    "assessment": fallback
                }
                
        except Exception as e:
            print(f"Error creating assessment: {e}")
            fallback = self._create_fallback_assessment(concept, subject, difficulty)
            self.assessment_cache[cache_key] = fallback
            return {
                "success": False,
                "error": str(e),
                "assessment": fallback
            }
    
    def _create_fallback_assessment(self, concept: str, subject: str, difficulty: str) -> Dict[str, Any]:
        """Create a basic fallback assessment when the main generation fails."""
        return {
            "questions": [
                {
                    "id": "q1",
                    "question": f"Which of the following best describes {concept}?",
                    "type": "multiple_choice",
                    "options": [
                        f"A key concept in {subject}",
                        f"An unrelated topic to {subject}",
                        f"A historical figure in {subject}",
                        f"A tool used only in advanced {subject}"
                    ],
                    "correct_answer": "A key concept in {subject}",
                    "explanation": f"{concept} is indeed a fundamental concept in {subject}."
                },
                {
                    "id": "q2",
                    "question": f"True or False: {concept} is important for understanding {subject}.",
                    "type": "true_false",
                    "options": ["True", "False"],
                    "correct_answer": "True",
                    "explanation": f"{concept} is a crucial component for understanding {subject}."
                }
            ],
            "passing_score": 1,
            "concept_assessed": concept,
            "difficulty": difficulty,
            "created_at": datetime.now().isoformat()
        }
            
    async def grade_assessment(self, user_answers: List[Dict[str, Any]], assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Grade user's assessment answers and provide feedback."""
        
        questions = assessment.get("questions", [])
        passing_score = assessment.get("passing_score", len(questions) // 2)
        concept = assessment.get("concept", "the concept")
        subject = assessment.get("subject", "the subject")
        
        # Match user answers with questions
        correct_count = 0
        question_results = []
        
        for user_answer in user_answers:
            q_id = user_answer.get("id")
            answer = user_answer.get("answer")
            
            # Find matching question
            matching_question = next((q for q in questions if q.get("id") == q_id), None)
            
            if matching_question:
                correct = self._check_answer(answer, matching_question)
                
                if correct:
                    correct_count += 1
                
                question_results.append({
                    "id": q_id,
                    "question": matching_question.get("question"),
                    "user_answer": answer,
                    "correct": correct,
                    "correct_answer": matching_question.get("correct_answer"),
                    "explanation": matching_question.get("explanation")
                })
        
        # Determine if passing
        passed = correct_count >= passing_score
        
        # Generate feedback based on performance
        if passed:
            if correct_count == len(questions):
                feedback = f"Excellent work! You've demonstrated complete mastery of {concept}."
            else:
                feedback = f"Good job! You've shown a solid understanding of {concept}."
        else:
            feedback = f"You're making progress with {concept}, but let's review some key points."
        
        # Calculate percentage score
        score_percentage = (correct_count / len(questions)) * 100 if questions else 0
        
        return {
            "success": True,
            "passed": passed,
            "score": correct_count,
            "total": len(questions),
            "score_percentage": score_percentage,
            "passing_score": passing_score,
            "feedback": feedback,
            "question_results": question_results,
            "concept": concept,
            "subject": subject,
            "completed_at": datetime.now().isoformat()
        }
    
    def _check_answer(self, user_answer: Any, question: Dict[str, Any]) -> bool:
        """Check if user's answer is correct."""
        question_type = question.get("type", "multiple_choice")
        correct_answer = question.get("correct_answer")
        
        if question_type == "multiple_choice":
            # Handle both index-based and value-based answers
            if isinstance(user_answer, int):
                options = question.get("options", [])
                if 0 <= user_answer < len(options):
                    return options[user_answer] == correct_answer
                return False
            else:
                return user_answer == correct_answer
                
        elif question_type == "true_false":
            # Convert to boolean if needed
            if isinstance(user_answer, bool):
                return (user_answer and correct_answer == "True") or (not user_answer and correct_answer == "False")
            else:
                return str(user_answer) == correct_answer
                
        elif question_type == "short_answer":
            # Simple exact match for short answer
            # In a real implementation, this would use more sophisticated matching
            user_answer_lower = str(user_answer).lower().strip()
            correct_answer_lower = str(correct_answer).lower().strip()
            
            # Simple check - in a real implementation, this would use
            # more sophisticated semantic matching
            return user_answer_lower == correct_answer_lower or \
                user_answer_lower in correct_answer_lower or \
                correct_answer_lower in user_answer_lower
                
        # Default case
        return str(user_answer) == str(correct_answer)
    
    async def provide_teaching_recommendations(self, assessment_result: Dict[str, Any]) -> Dict[str, Any]:
        """Provide teaching recommendations based on assessment results."""
        
        passed = assessment_result.get("passed", False)
        question_results = assessment_result.get("question_results", [])
        concept = assessment_result.get("concept", "the concept")
        subject = assessment_result.get("subject", "the subject")
        
        # If the user passed, recommend next steps
        if passed:
            return {
                "success": True,
                "should_continue": True,
                "message": f"Great job! You've demonstrated understanding of {concept}. Let's continue with the next concept.",
                "next_action": "continue_teaching"
            }
        
        # If the user failed, provide recommendations for review
        # Find incorrect questions
        incorrect_questions = [q for q in question_results if not q.get("correct", False)]
        
        # Generate focused review points
        review_points = []
        for q in incorrect_questions:
            explanation = q.get("explanation", "")
            review_points.append(f"Review: {explanation}")
        
        return {
            "success": True,
            "should_continue": False,
            "message": f"Let's review {concept} a bit more before moving on.",
            "review_points": review_points,
            "next_action": "review_concept"
        }


class ManagerAgent(VEDYAAgent):
    """Manager agent that coordinates and finalizes workflows."""
    
    def __init__(self):
        model = os.getenv("MANAGER_AGENT_MODEL", "o4-mini")
        super().__init__("ManagerAgent", model, 0.1)
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Coordinate final workflow steps and trigger notifications."""
        # Add final coordination tasks
        final_task = {
            "task_id": f"task_{uuid.uuid4().hex[:8]}",
            "title": "Finalize Learning Plan",
            "status": "completed",
            "assigned_agent": "ManagerAgent",
            "priority": "high"
        }
        
        updated_tasks = state.get("kanban_tasks", []) + [final_task]
        
        # Trigger email notifications if learning plan is complete
        await self._send_completion_notifications(state)
        
        return {
            "kanban_tasks": updated_tasks,
            "workflow_stage": "completed",
            "next_action": "end",
            "completed_agents": state.get("completed_agents", []) + ["ManagerAgent"]
        }
    
    async def _send_completion_notifications(self, state: WorkflowState):
        """Send email notifications when learning plan is complete."""
        try:
            user_input = state.get("user_input", {})
            learning_plan = state.get("learning_plan", {})
            
            # Extract user information
            user_email = user_input.get("email")
            user_name = user_input.get("name", "Learner")
            plan_title = learning_plan.get("title", "Your Personalized Learning Plan")
            plan_summary = learning_plan.get("summary", "A comprehensive learning plan tailored to your goals.")
            
            if user_email:
                # Send learning plan ready notification
                success = await email_service.send_learning_plan_ready(
                    user_email, user_name, plan_title, plan_summary
                )
                if success:
                    print(f"✅ Learning plan notification sent to {user_email}")
                else:
                    print(f"❌ Failed to send learning plan notification to {user_email}")
            
        except Exception as e:
            print(f"⚠️ Error sending completion notifications: {e}")


class NotificationAgent(VEDYAAgent):
    """Agent responsible for managing all notifications and email communications."""
    
    def __init__(self):
        super().__init__("NotificationAgent", "o4-mini", 0.1)
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Handle notification tasks."""
        notification_tasks = []
        
        # Create notification tasks
        if state.get("trigger_welcome"):
            notification_tasks.append({
                "task_id": f"notif_{uuid.uuid4().hex[:8]}",
                "title": "Send Welcome Email",
                "status": "in_progress",
                "assigned_agent": "NotificationAgent",
                "priority": "medium"
            })
        
        if state.get("trigger_plan_ready"):
            notification_tasks.append({
                "task_id": f"notif_{uuid.uuid4().hex[:8]}",
                "title": "Send Learning Plan Ready Notification",
                "status": "in_progress", 
                "assigned_agent": "NotificationAgent",
                "priority": "high"
            })
        
        return {
            "kanban_tasks": state.get("kanban_tasks", []) + notification_tasks,
            "completed_agents": state.get("completed_agents", []) + ["NotificationAgent"],
            "next_action": "continue"
        }
    
    async def send_welcome_email(self, user_email: str, user_name: str) -> bool:
        """Send welcome email to new users."""
        return await email_service.send_welcome_email(user_email, user_name)
    
    async def send_daily_summary(self, user_email: str, user_name: str, summary_data: Dict[str, Any]) -> bool:
        """Send daily learning summary."""
        return await email_service.send_daily_summary(user_email, user_name, summary_data)
    
    async def send_progress_milestone(self, user_email: str, user_name: str, milestone: str, completion_percentage: float) -> bool:
        """Send progress milestone notification."""
        return await email_service.send_progress_milestone(user_email, user_name, milestone, completion_percentage)
    
    async def send_weekly_report(self, user_email: str, user_name: str, weekly_data: Dict[str, Any]) -> bool:
        """Send weekly learning report."""
        return await email_service.send_weekly_report(user_email, user_name, weekly_data)


class TeachingAssistantAgent(VEDYAAgent):
    """AI Teaching Assistant that provides real-time guidance and personalized instruction."""
    
    def __init__(self):
        model = os.getenv("TEACHING_ASSISTANT_MODEL", "o4-mini")
        # Use default temperature (1.0) for o4-mini model which doesn't support custom temperatures
        super().__init__("TeachingAssistant", model, 1.0)
        self.teaching_context = {}
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Execute teaching assistance tasks."""
        teaching_tasks = []
        
        # Create teaching tasks based on current learning progress
        if state.get("start_teaching_session"):
            teaching_tasks.append({
                "task_id": f"teach_{uuid.uuid4().hex[:8]}",
                "title": "Initialize Teaching Session",
                "status": "in_progress",
                "assigned_agent": "TeachingAssistant",
                "priority": "high"
            })
        
        return {
            "kanban_tasks": state.get("kanban_tasks", []) + teaching_tasks,
            "completed_agents": state.get("completed_agents", []) + ["TeachingAssistant"],
            "next_action": "continue"
        }
    
    async def start_teaching_session(self, learning_plan: Dict[str, Any], user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new teaching session with contextual awareness."""
        
        # Build context-aware prompt
        subject = learning_plan.get('subject', 'Unknown Subject')
        learning_style = learning_plan.get('learning_style', 'Mixed')
        difficulty = learning_plan.get('difficulty', 'Intermediate')
        current_module = learning_plan.get('modules', [{}])[0].get('title', 'Introduction')
        
        system_prompt = f"""You are an expert AI instructor teaching {subject}. 

STUDENT CONTEXT:
- Subject: {subject}
- Learning Style: {learning_style}
- Difficulty Level: {difficulty}
- Current Module: {current_module}
- Learning Plan: {learning_plan.get('description', 'Comprehensive learning curriculum')}

TEACHING APPROACH:
1. Be conversational and highly interactive - this is not a lecture
2. Start by asking a question to gauge the student's prior knowledge
3. Present information in small, digestible chunks (2-3 sentences max)
4. After each chunk, check for understanding with a simple question
5. Adapt your explanations based on student responses
6. Use the student's preferred learning style ({learning_style})
7. Adjust explanations to {difficulty} level
8. Use concrete examples and real-world applications

STRUCTURE:
1. Begin with a brief, friendly welcome (1-2 sentences)
2. Ask about their existing knowledge of the topic
3. Present only ONE concept at a time
4. Check understanding before moving to the next concept
5. Use visual descriptions when appropriate

IMPORTANT:
- DO NOT present a full lecture with multiple sections
- DO NOT present multiple concepts at once
- DO NOT use numbered lists or extensive bullet points
- DO NOT overwhelm with information
- Keep your responses short and focused
- Imagine you are tutoring one-on-one, not lecturing to a class

Start with a warm welcome and ask about their familiarity with {current_module} to gauge their knowledge level."""

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Start teaching session for {current_module} in {subject}")
            ]
            
            response = await self.llm.ainvoke(messages)
            
            return {
                "success": True,
                "initial_message": response.content,
                "current_concept": current_module.lower().replace(' ', '_'),
                "plan_data": learning_plan,
                "session_context": {
                    "subject": subject,
                    "module": current_module,
                    "learning_style": learning_style,
                    "difficulty": difficulty
                }
            }
            
        except Exception as e:
            print(f"Error in teaching session start: {e}")
            return {
                "success": False,
                "initial_message": f"Welcome to your {subject} learning session! I'm excited to guide you through {current_module}. Let's begin exploring the fundamentals together.",
                "current_concept": "introduction",
                "plan_data": learning_plan
            }
    
    async def handle_teaching_chat(
        self, message: str, session_context: Dict[str, Any], image_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        """Handle ongoing teaching conversation with contextual awareness."""
        
        subject = session_context.get('subject', 'the subject')
        current_module = session_context.get('module', 'this topic')
        learning_style = session_context.get('learning_style', 'Mixed')
        difficulty = session_context.get('difficulty', 'Intermediate')
        
        # Keep track of conversation context in memory (would be DB in production)
        if message.lower() in ["exit", "quit", "end session"]:
            # Trigger assessment if user indicates they're done with the current topic
            return {
                "success": True,
                "response": "Let's check your understanding of what we've covered so far before moving on.",
                "type": "text",
                "trigger_assessment": True,
                "current_concept": session_context.get('current_concept', current_module.lower().replace(' ', '_'))
            }
        
        # If the user is submitting a "pointing" answer (they marked an area and want us to evaluate)
        evaluating_pointing = session_context.get("evaluating_user_pointing") and session_context.get("pointing_question") and image_base64
        if evaluating_pointing:
            pointing_question = session_context.get("pointing_question", "")
            eval_system = f"""You are evaluating the student's answer. They were asked: "{pointing_question}"

They have submitted an image where they marked an area (e.g. on a map or diagram). Look at the image and determine if they pointed to the CORRECT location.

- If CORRECT: Say so briefly and encouragingly (1-2 sentences). Do NOT add any BLACKBOARD_FEEDBACK line.
- If INCORRECT: Say so briefly, tell them where the correct answer is (1-2 sentences). Then on a new line add exactly:
BLACKBOARD_FEEDBACK: <one DALL·E prompt to show the same image with the correct location highlighted, e.g. "India map with Rajasthan state highlighted in red">"""
            human_content = [
                {"type": "text", "text": f"The question was: {pointing_question}. The student says: {message}. Their marked image is attached."},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
            ]
            try:
                response = await self.llm.ainvoke([
                    SystemMessage(content=eval_system),
                    HumanMessage(content=human_content)
                ])
                return {
                    "success": True,
                    "response": response.content,
                    "type": "text",
                    "current_concept": session_context.get('current_concept', ''),
                    "should_generate_visual": False,
                    "trigger_assessment": False
                }
            except Exception as e:
                print(f"Error in teaching chat (evaluate pointing): {e}")
                return {
                    "success": False,
                    "response": "I had trouble checking your answer. Please try again or ask for another question.",
                    "type": "text"
                }
        
        # If the user asked for a drawing and we're showing it on the blackboard, tell the agent so it doesn't duplicate with ASCII
        blackboard_draw = session_context.get("user_requested_blackboard_drawing") and session_context.get("blackboard_image_ready")
        draw_subject_ctx = session_context.get("draw_subject", "")
        
        if blackboard_draw and draw_subject_ctx:
            system_prompt = f"""You are a friendly AI tutor. The student asked for a drawing: "{draw_subject_ctx}".

We are already displaying that drawing on the BLACKBOARD (the panel next to this chat). So:
- Do NOT provide ASCII art, text sketches, or duplicate the drawing in the chat.
- Reply in 1-2 short sentences: acknowledge that you've drawn it on the blackboard and invite them to look at it.
- Stay on the student's topic. If they asked for circles and a line (or an apple, or a simple shape), do NOT pivot to neural networks or AI unless they explicitly asked about that.
- End with one brief, relevant question if natural (e.g. "What would you like to try next?" or "Want me to draw something else?")."""
        else:
            system_prompt = f"""You are an expert AI instructor teaching {subject}, specifically the module: {current_module}.

CONTEXT:
- Student's Learning Style: {learning_style}
- Difficulty Level: {difficulty}
- Current Focus: {current_module}

TEACHING GUIDELINES:
1. Be conversational and highly interactive - like a one-on-one tutor
2. Present information in small, digestible chunks (2-3 sentences max)
3. Analyze the student's questions to gauge their understanding
4. If they seem confused, simplify and provide different examples
5. If they show understanding, introduce a slightly more advanced concept
6. Use the student's preferred learning style ({learning_style})
7. Adjust explanations to {difficulty} level
8. Keep all responses under 5 sentences

RESPONSE INSTRUCTIONS:
- Respond to what the student ACTUALLY asked. If they asked about an everyday object (e.g. an apple) or a simple drawing (circles, shapes), stay on that topic. Do NOT force the conversation to neural networks or AI unless they asked for that.
- End each response with a thoughtful question to maintain dialogue
- Use concrete examples related to the student's current topic
- Be encouraging and supportive
- Don't overwhelm with information
- NEVER present multiple concepts at once
- NEVER use extensive numbered lists or bullet points
- NEVER respond with ASCII art or text-based drawings when they asked for an image—we show images on the blackboard instead

Remember: You are having a conversation with the student, not delivering a lecture."""

        try:
            if image_base64:
                human_content = [
                    {"type": "text", "text": f"Student says: {message}. They shared an image (e.g. a sketch or diagram). Look at the image and respond to what they're showing or asking."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
                ]
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=human_content)
                ]
            else:
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Student says: {message}")
                ]
            
            response = await self.llm.ainvoke(messages)
            
            # Determine if response should trigger visual generation
            message_lower = message.lower()
            response_lower = response.content.lower()
            
            should_generate_visual = any(keyword in message_lower for keyword in 
                ['visual', 'diagram', 'show', 'picture', 'graph', 'chart', 'illustration']) or \
                any(keyword in response_lower for keyword in ['diagram', 'visual', 'chart', 'graph'])
            
            # Check if we should trigger assessment based on student's apparent mastery
            trigger_assessment = any(keyword in message_lower for keyword in 
                ['understand', 'got it', 'makes sense', 'clear now', 'next topic', 'understood', 'assessment', 'test', 'quiz', 'check']) and \
                not any(keyword in message_lower for keyword in ['don\'t understand', 'confused', 'unclear', 'explain again'])
            
            return {
                "success": True,
                "response": response.content,
                "type": "text",
                "current_concept": session_context.get('current_concept', current_module.lower().replace(' ', '_')),
                "should_generate_visual": should_generate_visual,
                "suggested_visual_type": "concept_diagram" if should_generate_visual else None,
                "trigger_assessment": trigger_assessment
            }
            
        except Exception as e:
            print(f"Error in teaching chat: {e}")
            return {
                "success": False,
                "response": "I'm having a brief moment of difficulty, but let's continue our lesson. Can you tell me what specific aspect you'd like me to explain further?",
                "type": "text"
            }
    
    async def stream_teaching_chat(self, message: str, session_context: Dict[str, Any]):
        """Handle teaching conversation with streaming support."""
        from streaming_utils import stream_text_chunks
        
        subject = session_context.get('subject', 'the subject')
        current_module = session_context.get('module', 'this topic')
        learning_style = session_context.get('learning_style', 'Mixed')
        difficulty = session_context.get('difficulty', 'Intermediate')
        
        # Check for exit commands to trigger assessment
        if message.lower() in ["exit", "quit", "end session"]:
            yield {
                "type": "content",
                "content": "Let's check your understanding of what we've covered so far before moving on.",
                "accumulated": "Let's check your understanding of what we've covered so far before moving on."
            }
            
            yield {
                "type": "metadata",
                "current_concept": session_context.get('current_concept', current_module.lower().replace(' ', '_')),
                "should_generate_visual": False,
                "trigger_assessment": True,
                "full_response": "Let's check your understanding of what we've covered so far before moving on."
            }
            return
        
        system_prompt = f"""You are an expert AI instructor teaching {subject}, specifically the module: {current_module}.

CONTEXT:
- Student's Learning Style: {learning_style}
- Difficulty Level: {difficulty}
- Current Focus: {current_module}

TEACHING GUIDELINES:
1. Be conversational and highly interactive - like a one-on-one tutor
2. Present information in small, digestible chunks (2-3 sentences max)
3. Analyze the student's questions to gauge their understanding
4. If they seem confused, simplify and provide different examples
5. If they show understanding, introduce a slightly more advanced concept
6. Use the student's preferred learning style ({learning_style})
7. Adjust explanations to {difficulty} level
8. Keep all responses under 5 sentences

RESPONSE INSTRUCTIONS:
- End each response with a thoughtful question to maintain dialogue
- Use concrete examples related to {subject}
- Be encouraging and supportive
- Don't overwhelm with information
- NEVER present multiple concepts at once
- NEVER use extensive numbered lists or bullet points
- Adjust your teaching pace based on the student's responses

Remember: You are having a conversation with the student, not delivering a lecture."""

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Student says: {message}")
            ]
            
            # First, get the complete response from the LLM
            full_response = ""
            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, 'content') and chunk.content:
                    full_response += chunk.content
            
            # Then stream it character by character for a ChatGPT-like experience
            accumulated_content = ""
            async for char in stream_text_chunks(full_response, character_by_character=True):
                accumulated_content += char
                yield {
                    "type": "content",
                    "content": char,
                    "accumulated": accumulated_content
                }
            
            # Send final metadata
            message_lower = message.lower()
            should_generate_visual = any(keyword in message_lower for keyword in 
                ['visual', 'diagram', 'show', 'picture', 'graph', 'chart', 'illustration']) or \
                any(keyword in accumulated_content.lower() for keyword in ['diagram', 'visual', 'chart', 'graph'])
            
            # Check if we should trigger assessment based on student's apparent mastery
            trigger_assessment = any(keyword in message_lower for keyword in 
                ['understand', 'got it', 'makes sense', 'clear now', 'next topic', 'understood', 'assessment', 'test', 'quiz', 'check']) and \
                not any(keyword in message_lower for keyword in ['don\'t understand', 'confused', 'unclear', 'explain again'])
            
            yield {
                "type": "metadata",
                "current_concept": session_context.get('current_concept', current_module.lower().replace(' ', '_')),
                "should_generate_visual": should_generate_visual,
                "suggested_visual_type": "concept_diagram" if should_generate_visual else None,
                "trigger_assessment": trigger_assessment,
                "full_response": accumulated_content
            }
            
        except Exception as e:
            print(f"Error in streaming teaching chat: {e}")
            yield {
                "type": "error",
                "content": "I'm having a brief moment of difficulty, but let's continue our lesson. Can you tell me what specific aspect you'd like me to explain further?"
            }


class ImageGenerationAssistant(VEDYAAgent):
    """Supervised AI assistant for generating educational images and diagrams."""
    
    def __init__(self):
        super().__init__("ImageGenerationAssistant", "gpt-4o", 0.1)  # Low temperature for consistency
        self.approved_content_types = [
            "educational_diagram", "concept_illustration", "flowchart", "mind_map", 
            "scientific_visualization", "mathematical_graph", "historical_timeline",
            "process_explanation", "comparison_chart", "organizational_structure"
        ]
    
    async def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """Execute image generation tasks under supervision."""
        return {"status": "ready", "agent": "ImageGenerationAssistant"}
    
    async def generate_educational_visual(self, concept: str, subject: str, visual_type: str, 
                                        supervisor_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate educational visuals with supervision and content validation."""
        
        # Validate request through supervisor context
        if not self._validate_educational_request(concept, subject, visual_type, supervisor_context):
            return {
                "success": False,
                "error": "Request does not meet educational content guidelines",
                "visual_url": None
            }
        
        # Create educational prompt for image generation
        educational_prompt = self._create_educational_prompt(concept, subject, visual_type)
        
        try:
            # Generate image using OpenAI DALL·E 3
            visual_url = await self._generate_image_openai(educational_prompt)
            if not visual_url:
                visual_url = self._generate_contextual_placeholder(concept, subject, visual_type)
            
            # Log generation for monitoring
            await self._log_generation_request(concept, subject, visual_type, supervisor_context)
            
            return {
                "success": True,
                "visual_url": visual_url,
                "visual_type": visual_type,
                "concept": concept,
                "subject": subject,
                "educational_context": educational_prompt,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error generating educational visual: {e}")
            return {
                "success": False,
                "error": str(e),
                "visual_url": None
            }
    
    def _validate_educational_request(self, concept: str, subject: str, visual_type: str, 
                                    supervisor_context: Dict[str, Any]) -> bool:
        """Validate that the request is for legitimate educational content."""
        
        # Check if visual type is approved
        if visual_type not in self.approved_content_types:
            return False
        
        # Check if request comes from teaching context
        teaching_session = supervisor_context.get('teaching_session', False)
        authorized_agent = supervisor_context.get('requesting_agent') == 'TeachingAssistant'
        
        if not (teaching_session and authorized_agent):
            return False
        
        # Check if concept relates to the subject being taught
        current_subject = supervisor_context.get('current_subject', '').lower()
        if current_subject and current_subject not in subject.lower():
            return False
        
        # Additional content validation
        prohibited_keywords = ['inappropriate', 'offensive', 'violent', 'adult', 'graphic']
        concept_lower = concept.lower()
        
        if any(keyword in concept_lower for keyword in prohibited_keywords):
            return False
        
        return True
    
    def _create_educational_prompt(self, concept: str, subject: str, visual_type: str) -> str:
        """Create educational-focused prompt for image generation."""
        
        prompts = {
            "concept_illustration": f"Educational illustration of {concept} in {subject}. Clean, academic style with clear labels and educational focus. Professional textbook quality.",
            "flowchart": f"Clear flowchart diagram showing {concept} process in {subject}. Use arrows, boxes, and clear text labels. Professional educational style.",
            "mind_map": f"Educational mind map for {concept} in {subject}. Central topic with branching subtopics, clear hierarchy, colorful but professional.",
            "scientific_visualization": f"Scientific diagram of {concept} in {subject}. Accurate, detailed, with proper labels and annotations. Academic journal quality.",
            "comparison_chart": f"Educational comparison chart for {concept} in {subject}. Clear columns, readable text, professional academic presentation.",
            "process_explanation": f"Step-by-step visual explanation of {concept} in {subject}. Sequential panels with clear progression and educational annotations."
        }
        
        return prompts.get(visual_type, f"Educational diagram of {concept} in {subject}. Clean, clear, academic style.")
    
    async def _generate_image_openai(self, prompt: str) -> Optional[str]:
        """Generate an image using OpenAI DALL·E 3. Returns a data URL or None on failure."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or not api_key.startswith("sk-"):
            print("⚠️ OPENAI_API_KEY missing or invalid, skipping DALL·E")
            return None

        def _call_dalle() -> Optional[str]:
            try:
                client = openai.OpenAI(api_key=api_key)
                # DALL·E 3: sync API only; keep prompt within length/safety
                safe_prompt = (prompt or "Educational diagram")[:4000]
                resp = client.images.generate(
                    model="dall-e-3",
                    prompt=safe_prompt,
                    size="1024x1024",
                    quality="standard",
                    response_format="b64_json",
                    style="natural",
                    n=1,
                )
                if not resp.data or len(resp.data) == 0:
                    return None
                b64 = getattr(resp.data[0], "b64_json", None)
                if not b64:
                    return None
                return f"data:image/png;base64,{b64}"
            except Exception as e:
                print(f"⚠️ DALL·E generation failed: {e}")
                return None

        try:
            return await asyncio.to_thread(_call_dalle)
        except Exception as e:
            print(f"⚠️ DALL·E task failed: {e}")
            return None

    def _generate_contextual_placeholder(self, concept: str, subject: str, visual_type: str) -> str:
        """Generate inline SVG diagram (data URL). No external image service required."""
        from diagram_utils import make_diagram_data_url

        subject_colors = {
            'artificial intelligence': '4F46E5',
            'computer science': '059669',
            'mathematics': 'DC2626',
            'physics': '7C3AED',
            'chemistry': 'EA580C',
            'biology': '16A34A',
            'history': '92400E',
            'literature': 'BE185D',
        }
        color = subject_colors.get(subject.lower(), '6366F1')
        if visual_type == "flowchart":
            return make_diagram_data_url(concept, subject, "Flowchart · Process Visualization", color)
        if visual_type == "mind_map":
            return make_diagram_data_url(concept, subject, "Mind Map · Core Concept", color)
        if visual_type == "comparison_chart":
            return make_diagram_data_url(concept, subject, "Comparison Chart", color)
        return make_diagram_data_url(concept, subject, "Educational Diagram", color)
    
    async def _log_generation_request(self, concept: str, subject: str, visual_type: str, 
                                    supervisor_context: Dict[str, Any]) -> None:
        """Log image generation requests for monitoring and audit purposes."""
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "concept": concept,
            "subject": subject,
            "visual_type": visual_type,
            "requesting_agent": supervisor_context.get('requesting_agent'),
            "teaching_session_id": supervisor_context.get('session_id'),
            "student_context": supervisor_context.get('student_context', {})
        }
        
        # In production, this would write to a proper logging system
        print(f"🎨 Image Generation Log: {json.dumps(log_entry, indent=2)}")
    
    async def generate_teaching_visual(self, concept: str, visual_type: str, 
                                    supervisor_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate a teaching visual for the given concept.
        
        This is the main entry point used by the API server to generate visuals for the teaching interface.
        """
        import uuid
        
        # Default supervisor context if not provided
        if supervisor_context is None:
            supervisor_context = {
                "teaching_session": True,
                "requesting_agent": "TeachingAssistant",
                "current_subject": "Artificial Intelligence",
                "session_id": f"session_{uuid.uuid4().hex[:8]}",
                "student_context": {"subject": "Artificial Intelligence"}
            }
            
        # Extract subject from context
        subject = supervisor_context.get("current_subject", "Artificial Intelligence")
        
        print(f"🎨 Generating teaching visual for concept: '{concept}', type: '{visual_type}'")
        
        # Call the educational visual generator
        return await self.generate_educational_visual(concept, subject, visual_type, supervisor_context)


class VEDYALangGraphSystem:
    """Main VEDYA system using LangGraph for workflow orchestration."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.checkpointer = MemorySaver()
        self.agents = self._initialize_agents()
        self.workflow = self._create_workflow()
        
    def _initialize_agents(self) -> Dict[str, VEDYAAgent]:
        """Initialize all agents."""
        return {
            "supervisor": SupervisorAgent(),
            "planner": PlannerAgent(),
            "content_curator": ContentCuratorAgent(),
            "assessment": AssessmentAgent(),
            "teaching_assistant": TeachingAssistantAgent(),
            "image_generation": ImageGenerationAssistant(),
            "notification": NotificationAgent(),
            "manager": ManagerAgent()
        }
    
    def _create_workflow(self) -> StateGraph:
        """Create LangGraph workflow."""
        workflow = StateGraph(WorkflowState)
        
        # Add nodes for each agent
        workflow.add_node("supervisor", self._supervisor_node)
        workflow.add_node("planner", self._planner_node)
        workflow.add_node("content_curator", self._content_curator_node)
        workflow.add_node("assessment", self._assessment_node)
        workflow.add_node("manager", self._manager_node)
        
        # Define workflow edges
        workflow.set_entry_point("supervisor")
        workflow.add_edge("supervisor", "planner")
        workflow.add_edge("planner", "content_curator")
        workflow.add_edge("content_curator", "assessment")
        workflow.add_edge("assessment", "manager")
        workflow.add_edge("manager", END)
        
        return workflow.compile(checkpointer=self.checkpointer)
    
    async def _supervisor_node(self, state: WorkflowState) -> WorkflowState:
        """Execute supervisor agent."""
        result = await self.agents["supervisor"].execute(state)
        state.update(result)
        return state
    
    async def _planner_node(self, state: WorkflowState) -> WorkflowState:
        """Execute planner agent."""
        result = await self.agents["planner"].execute(state)
        state.update(result)
        return state
    
    async def _content_curator_node(self, state: WorkflowState) -> WorkflowState:
        """Execute content curator agent."""
        result = await self.agents["content_curator"].execute(state)
        state.update(result)
        return state
    
    async def _assessment_node(self, state: WorkflowState) -> WorkflowState:
        """Execute assessment agent."""
        result = await self.agents["assessment"].execute(state)
        state.update(result)
        return state
    
    async def _manager_node(self, state: WorkflowState) -> WorkflowState:
        """Execute manager agent."""
        result = await self.agents["manager"].execute(state)
        state.update(result)
        return state
    
    async def process_learning_request(self, user_input: str, user_id: str = None) -> Dict[str, Any]:
        """Process a learning request through the agent workflow."""
        thread_id = f"thread_{user_id or 'user'}_{uuid.uuid4().hex[:6]}_{datetime.now().isoformat()}"
        
        # Initial state
        initial_state = WorkflowState(
            messages=[HumanMessage(content=user_input)],
            learning_objective=None,
            learning_plan=None,
            kanban_tasks=[],
            current_agent="supervisor",
            workflow_stage="initialization",
            thread_id=thread_id,
            completed_agents=[],
            next_action="start"
        )
        
        # Execute workflow
        config = {"configurable": {"thread_id": thread_id}}
        final_state = await self.workflow.ainvoke(initial_state, config)
        
        return {
            "thread_id": thread_id,
            "learning_plan": final_state.get("learning_plan"),
            "kanban_tasks": final_state.get("kanban_tasks", []),
            "completed_agents": final_state.get("completed_agents", []),
            "workflow_stage": final_state.get("workflow_stage"),
            "status": "completed"
        }
    
    def generate_email_summary(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Generate email summary from workflow result."""
        learning_plan = result.get("learning_plan", {})
        subject = learning_plan.get("objectives", {}).get("subject", "Learning")
        
        return {
            "subject": f"Your {subject} Learning Plan is Ready!",
            "next_steps": [
                "Review your personalized learning plan",
                "Start with the first module",
                "Complete initial assessment"
            ],
            "ai_observations": [
                "Learning style preferences detected",
                "Optimal timeline calculated",
                "Content curated for your level"
            ],
            "progress_rating": 8.5
        }
    
    def get_workflow_graph(self) -> str:
        """Get visual representation of the workflow graph."""
        return """
🔄 VEDYA LangGraph Workflow:

    ┌─────────────┐
    │ Supervisor  │
    │   Agent     │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │   Planner   │
    │    Agent    │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Content    │
    │  Curator    │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │ Assessment  │
    │   Agent     │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Manager    │
    │   Agent     │
    └──────┬──────┘
           │
        ┌──▼──┐
        │ END │
        └─────┘

State Management: LangGraph Checkpointing
Tool Integration: LangChain Tools
Coordination: Shared State Graph
"""


# Factory function for creating the system
def create_vedya_langgraph_system(config: Dict[str, Any] = None) -> VEDYALangGraphSystem:
    """Create and configure the VEDYA LangGraph system."""
    default_config = {
        "database_url": os.getenv("DATABASE_URL", "sqlite:///vedya.db"),
        "checkpoint_type": "memory",
        "openai_api_key": os.getenv("OPENAI_API_KEY", "demo-key"),
        "models": {
            "supervisor": "gpt-4o",
            "planner": "gpt-4o",
            "content_curator": "gpt-4o",
            "assessment": "gpt-4o",
            "manager": "gpt-4o"
        },
        "langgraph": {
            "parallel_execution": True,
            "error_recovery": True,
            "state_persistence": True
        }
    }
    
    if config:
        default_config.update(config)
    
    return VEDYALangGraphSystem(default_config)


if __name__ == "__main__":
    # Demo usage
    async def demo():
        system = create_vedya_langgraph_system()
        
        result = await system.process_learning_request(
            "I want to learn about machine learning. I prefer hands-on learning.",
            user_id="demo_user"
        )
        
        print("🎓 VEDYA LangGraph Demo Result:")
        print(f"📝 Thread ID: {result['thread_id']}")
        print(f"📚 Learning Plan: {result['learning_plan']['plan_id']}")
        print(f"🤖 Completed Agents: {len(result['completed_agents'])}")
        print(f"📊 Workflow Stage: {result['workflow_stage']}")
        
        email_summary = system.generate_email_summary(result)
        print(f"📧 Email Subject: {email_summary['subject']}")
    
    asyncio.run(demo())
