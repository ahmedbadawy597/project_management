import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Capability } from './capabilities'
import { CAPABILITIES_KEY } from './capabilities.decorator'
import type { RequestUser } from '../auth/auth.types'

@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Capability[]>(CAPABILITIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>()
    const user = request.user
    if (!user) throw new ForbiddenException('Forbidden')

    const ok = required.every((cap) => user.capabilities.includes(cap))
    if (!ok) throw new ForbiddenException('Forbidden')
    return true
  }
}
