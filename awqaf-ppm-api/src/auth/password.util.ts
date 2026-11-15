import * as bcrypt from 'bcryptjs'

/** Temporary password issued on seed / new user creation — must be changed on first login. */
export const DEFAULT_TEMP_PASSWORD = 'Awqaf@2026'

const ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function usernameFromEmail(email: string): string {
  const local = email.trim().toLowerCase().split('@')[0] ?? ''
  return local.replace(/[^a-z0-9._-]/g, '') || `user${Date.now()}`
}
