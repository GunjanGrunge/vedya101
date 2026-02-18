/**
 * Admin account: only this email gets the admin dashboard and full control over all user data.
 */
export const ADMIN_EMAIL = 'souvikbasu098@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
