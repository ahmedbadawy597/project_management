import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { capabilitiesForRole } from '../common/capabilities'
import type { JwtPayload, RequestUser } from './auth.types'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'awqaf-ppm-dev-secret',
    })
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload?.personId || !payload?.role || !payload?.personaId) {
      throw new UnauthorizedException('Unauthorized')
    }
    return {
      ...payload,
      capabilities: capabilitiesForRole(payload.role),
    }
  }
}
