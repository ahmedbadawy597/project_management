import { SetMetadata } from '@nestjs/common'
import type { Capability } from './capabilities'

export const CAPABILITIES_KEY = 'capabilities'
export const RequireCapabilities = (...capabilities: Capability[]) =>
  SetMetadata(CAPABILITIES_KEY, capabilities)
