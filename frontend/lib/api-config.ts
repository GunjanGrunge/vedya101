// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const API_ENDPOINTS = {
  chat: `${API_BASE_URL}/chat`,
  chatStream: `${API_BASE_URL}/chat/stream`,
  chatSessions: `${API_BASE_URL}/chat/sessions`,
  chatSessionsList: (clerkId: string) => `${API_BASE_URL}/chat/sessions?clerk_user_id=${encodeURIComponent(clerkId)}`,
  chatSessionDelete: (sessionId: string, clerkId: string) => `${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}?clerk_user_id=${encodeURIComponent(clerkId)}`,
  chatMessages: `${API_BASE_URL}/chat/messages`,
  chatMessagesList: (sessionId: string) => `${API_BASE_URL}/chat/messages?session_id=${encodeURIComponent(sessionId)}`,
  plan: `${API_BASE_URL}/generate_learning_plan`,
  health: `${API_BASE_URL}/health`,
  
  // Learning Plans (pass clerk_user_id for DB-backed plans)
  learningPlans: `${API_BASE_URL}/learning-plans`,
  learningPlansForUser: (clerkId: string) => `${API_BASE_URL}/learning-plans?clerk_user_id=${encodeURIComponent(clerkId)}`,
  learningPlanById: (planId: string, clerkId: string) => `${API_BASE_URL}/learning-plans/${planId}?clerk_user_id=${encodeURIComponent(clerkId)}`,
  learningPlanDelete: (planId: string, clerkId: string) => `${API_BASE_URL}/learning-plans/${planId}?clerk_user_id=${encodeURIComponent(clerkId)}`,
  learningPlanProgress: (planId: string, clerkId: string) => `${API_BASE_URL}/learning-plans/${planId}/progress?clerk_user_id=${encodeURIComponent(clerkId)}`,
  learningPlanSaveFromSession: `${API_BASE_URL}/learning-plans/from-session`,
  learningPlansCheck: `${API_BASE_URL}/learning-plans/check`,
  
  // Teaching
  teachingStart: `${API_BASE_URL}/teaching/start`,
  teachingChat: `${API_BASE_URL}/teaching/chat`,
  teachingTts: `${API_BASE_URL}/teaching/tts`,
  teachingDiagram: `${API_BASE_URL}/teaching/generate-diagram`,
  generateDiagramExcalidraw: `${API_BASE_URL}/teaching/generate-diagram`,
  executeCode: `${API_BASE_URL}/teaching/execute-code`,

  // Blackboard (Epic 4)
  explainAnnotation: `${API_BASE_URL}/teaching/explain-annotation`,
  sessionBlackboard: (sessionId: string) => `${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/blackboard`,
  userBlackboards: (clerkId: string) => `${API_BASE_URL}/users/blackboards?clerk_user_id=${encodeURIComponent(clerkId)}`,

  // User & Onboarding
  userRegister: `${API_BASE_URL}/users/register`,
  userByClerk: (clerkId: string) => `${API_BASE_URL}/users/clerk/${clerkId}`,
  freemiumStatus: (clerkId: string) => `${API_BASE_URL}/users/freemium-status?clerk_user_id=${encodeURIComponent(clerkId)}`,
  sessionEnd: `${API_BASE_URL}/users/session-end`,
  onboardingStatus: (clerkId: string) => `${API_BASE_URL}/users/onboarding-status?clerk_user_id=${encodeURIComponent(clerkId)}`,
  onboardingData: (clerkId: string) => `${API_BASE_URL}/users/onboarding-data?clerk_user_id=${encodeURIComponent(clerkId)}`,
  onboardingSave: `${API_BASE_URL}/users/onboarding`,
  planReadyMessage: `${API_BASE_URL}/settings/plan-ready-message`,

  // Orgs (Story 1.3 & 1.4)
  orgRegister: `${API_BASE_URL}/orgs/register`,
  orgInvite: `${API_BASE_URL}/orgs/invite`,
  orgMe: (clerkId: string) => `${API_BASE_URL}/orgs/me?clerk_user_id=${encodeURIComponent(clerkId)}`,
  userProductContext: (clerkId: string) => `${API_BASE_URL}/users/product-context?clerk_user_id=${encodeURIComponent(clerkId)}`,

  // Admin (requires admin email)
  adminCheck: (clerkId: string) => `${API_BASE_URL}/admin/check?clerk_user_id=${encodeURIComponent(clerkId)}`,
  adminUsers: (clerkId: string) => `${API_BASE_URL}/admin/users?clerk_user_id=${encodeURIComponent(clerkId)}`,
  adminLearningPlans: (clerkId: string) => `${API_BASE_URL}/admin/learning-plans?clerk_user_id=${encodeURIComponent(clerkId)}`,
  adminChatSessions: (clerkId: string) => `${API_BASE_URL}/admin/chat-sessions?clerk_user_id=${encodeURIComponent(clerkId)}`,
  adminDeleteUser: (userId: string, clerkId: string) => `${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}?clerk_user_id=${encodeURIComponent(clerkId)}`,
  adminDeleteLearningPlan: (planId: string, clerkId: string) => `${API_BASE_URL}/admin/learning-plans/${encodeURIComponent(planId)}?clerk_user_id=${encodeURIComponent(clerkId)}`,
  adminDeleteChatSession: (sessionId: string, clerkId: string) => `${API_BASE_URL}/admin/chat-sessions/${encodeURIComponent(sessionId)}?clerk_user_id=${encodeURIComponent(clerkId)}`,

  // Live sessions
  liveCurrent: `${API_BASE_URL}/live/current`,
  adminLiveStart: `${API_BASE_URL}/admin/live/start`,
  adminLiveStop: `${API_BASE_URL}/admin/live/stop`,

  // Achievements
  achievements: `${API_BASE_URL}/achievements`,
  userAchievements: (clerkId: string) => `${API_BASE_URL}/user/achievements?clerk_user_id=${encodeURIComponent(clerkId)}`,
  adminGrantAchievement: `${API_BASE_URL}/admin/achievements/grant`,
} as const

// WebSocket base URL (ws or wss from API URL)
export const WS_BASE_URL = (typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/^http/, 'ws')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/^http/, 'ws'))

export const WS_ENDPOINTS = {
  live: (sessionId: string, clerkUserId: string, userName: string, isAdmin: boolean) =>
    `${WS_BASE_URL}/ws/live?session_id=${encodeURIComponent(sessionId)}&clerk_user_id=${encodeURIComponent(clerkUserId)}&user_name=${encodeURIComponent(userName)}&is_admin=${isAdmin}`,
} as const

export { API_BASE_URL }
