import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { capabilitiesForRole, type AppRole } from '../common/capabilities'
import { mapJobRoleToAppRole } from '../common/access.service'
import { PERSONAS, personaByPersonId } from '../common/personas'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser, JwtPayload } from './auth.types'
import { hashPassword, verifyPassword } from './password.util'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  personas() {
    return PERSONAS
  }

  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const login = username.trim().toLowerCase()
    if (!login || !password) {
      throw new BadRequestException('Username and password are required')
    }

    const person = await this.prisma.person.findFirst({
      where: {
        OR: [{ username: login }, { email: login }],
      },
    })
    if (!person || person.active === false) {
      throw new UnauthorizedException('Invalid username or password')
    }

    const ok = await verifyPassword(password, person.passwordHash)
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password')
    }

    return this.issueToken(person)
  }

  async changePassword(
    personId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthUser> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters')
    }
    if (newPassword === currentPassword) {
      throw new BadRequestException('New password must be different from the current password')
    }

    const person = await this.prisma.person.findUnique({ where: { id: personId } })
    if (!person) throw new UnauthorizedException('Unauthorized')

    const ok = await verifyPassword(currentPassword, person.passwordHash)
    if (!ok) throw new BadRequestException('Current password is incorrect')

    const passwordHash = await hashPassword(newPassword)
    const updated = await this.prisma.person.update({
      where: { id: personId },
      data: { passwordHash, mustChangePassword: false },
    })
    return this.toAuthUser(updated)
  }

  async me(personId: string, _personaId: string): Promise<AuthUser> {
    const person = await this.prisma.person.findUnique({ where: { id: personId } })
    if (!person || person.active === false) {
      throw new UnauthorizedException('Unauthorized')
    }
    return this.toAuthUser(person)
  }

  private async issueToken(person: {
    id: string
    name: string
    nameAr: string
    email: string
    username: string
    role: string
    appRole: string
    mustChangePassword: boolean
  }): Promise<{ token: string; user: AuthUser }> {
    const user = this.toAuthUser(person)
    const payload: JwtPayload = {
      personaId: user.personaId,
      personId: person.id,
      role: user.role,
    }
    const token = await this.jwt.signAsync(payload)
    return { token, user }
  }

  private toAuthUser(person: {
    id: string
    name: string
    nameAr: string
    email: string
    username: string
    role: string
    appRole: string
    mustChangePassword: boolean
  }): AuthUser {
    const persona = personaByPersonId(person.id)
    const role = (persona?.role ??
      (person.appRole as AppRole) ??
      mapJobRoleToAppRole(person.role)) as AppRole
    return {
      id: person.id,
      personaId: persona?.id ?? person.username,
      name: person.name,
      nameAr: person.nameAr,
      email: person.email,
      username: person.username,
      role,
      capabilities: capabilitiesForRole(role),
      mustChangePassword: Boolean(person.mustChangePassword),
    }
  }
}
