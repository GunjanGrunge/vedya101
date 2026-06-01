/**
 * Tests for lib/api-config.ts — URL construction, no network calls.
 */
import { API_ENDPOINTS, WS_ENDPOINTS, API_BASE_URL } from '../lib/api-config'

describe('API_BASE_URL', () => {
  it('defaults to localhost:8000', () => {
    expect(API_BASE_URL).toBe('http://localhost:8000')
  })
})

describe('API_ENDPOINTS static routes', () => {
  it('chat endpoint is correct', () => {
    expect(API_ENDPOINTS.chat).toBe('http://localhost:8000/chat')
  })

  it('health endpoint is correct', () => {
    expect(API_ENDPOINTS.health).toBe('http://localhost:8000/health')
  })

  it('plan endpoint is correct', () => {
    expect(API_ENDPOINTS.plan).toBe('http://localhost:8000/generate_learning_plan')
  })

  it('orgRegister endpoint is correct', () => {
    expect(API_ENDPOINTS.orgRegister).toBe('http://localhost:8000/orgs/register')
  })
})

describe('API_ENDPOINTS dynamic routes', () => {
  it('freemiumStatus encodes clerk id', () => {
    const url = API_ENDPOINTS.freemiumStatus('user_abc123')
    expect(url).toBe('http://localhost:8000/users/freemium-status?clerk_user_id=user_abc123')
  })

  it('freemiumStatus encodes special characters in clerk id', () => {
    const url = API_ENDPOINTS.freemiumStatus('user abc+123')
    expect(url).toContain('clerk_user_id=user%20abc%2B123')
  })

  it('userByClerk builds correct path', () => {
    expect(API_ENDPOINTS.userByClerk('clerk_xyz')).toBe('http://localhost:8000/users/clerk/clerk_xyz')
  })

  it('chatSessionsList includes clerk_user_id query param', () => {
    const url = API_ENDPOINTS.chatSessionsList('user_1')
    expect(url).toBe('http://localhost:8000/chat/sessions?clerk_user_id=user_1')
  })

  it('chatSessionDelete encodes both sessionId and clerkId', () => {
    const url = API_ENDPOINTS.chatSessionDelete('sess-1', 'user-1')
    expect(url).toContain('/chat/sessions/sess-1')
    expect(url).toContain('clerk_user_id=user-1')
  })

  it('learningPlanById builds correct URL', () => {
    const url = API_ENDPOINTS.learningPlanById('plan-99', 'user-1')
    expect(url).toContain('/learning-plans/plan-99')
    expect(url).toContain('clerk_user_id=user-1')
  })

  it('orgMe builds correct URL', () => {
    expect(API_ENDPOINTS.orgMe('u1')).toBe('http://localhost:8000/orgs/me?clerk_user_id=u1')
  })

  it('adminCheck builds correct URL', () => {
    expect(API_ENDPOINTS.adminCheck('admin-1')).toBe('http://localhost:8000/admin/check?clerk_user_id=admin-1')
  })

  it('sessionBlackboard builds correct URL', () => {
    const url = API_ENDPOINTS.sessionBlackboard('session-42')
    expect(url).toBe('http://localhost:8000/sessions/session-42/blackboard')
  })

  it('userBlackboards builds correct URL', () => {
    const url = API_ENDPOINTS.userBlackboards('user-5')
    expect(url).toBe('http://localhost:8000/users/blackboards?clerk_user_id=user-5')
  })

  it('userAchievements builds correct URL', () => {
    const url = API_ENDPOINTS.userAchievements('user-7')
    expect(url).toBe('http://localhost:8000/user/achievements?clerk_user_id=user-7')
  })
})

describe('WS_ENDPOINTS', () => {
  it('live websocket URL uses ws protocol', () => {
    const url = WS_ENDPOINTS.live('sess-1', 'user-1', 'Alice', false)
    expect(url).toMatch(/^ws:\/\//)
  })

  it('live websocket URL includes all required params', () => {
    const url = WS_ENDPOINTS.live('sess-1', 'user-1', 'Alice', true)
    expect(url).toContain('session_id=sess-1')
    expect(url).toContain('clerk_user_id=user-1')
    expect(url).toContain('user_name=Alice')
    expect(url).toContain('is_admin=true')
  })

  it('live websocket URL encodes user name with spaces', () => {
    const url = WS_ENDPOINTS.live('sess-1', 'user-1', 'Bob Smith', false)
    expect(url).toContain('user_name=Bob%20Smith')
  })
})
