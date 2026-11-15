import type { AppRole, Capability } from '../common/capabilities'

export interface JwtPayload {
  personaId: string
  personId: string
  role: AppRole
}

export interface AuthUser {
  id: string
  personaId: string
  name: string
  nameAr: string
  email: string
  username: string
  role: AppRole
  capabilities: Capability[]
  mustChangePassword: boolean
}

export interface RequestUser extends JwtPayload {
  capabilities: Capability[]
}
