import { describe, expect, it } from 'vitest'
import {
  capabilitiesForRole,
  hasCapability,
  mapPersonRoleToAppRole,
} from './permissions'

describe('permissions', () => {
  it('gives Portfolio Director approval rights', () => {
    expect(hasCapability('Portfolio Director', 'approvals:decide')).toBe(true)
    expect(hasCapability('Portfolio Director', 'admin:view')).toBe(true)
  })

  it('denies Executive Viewer write capabilities', () => {
    expect(hasCapability('Executive Viewer', 'approvals:decide')).toBe(false)
    expect(hasCapability('Executive Viewer', 'tasks:write')).toBe(false)
    expect(hasCapability('Executive Viewer', 'executive:view')).toBe(true)
  })

  it('maps seed roles to app roles', () => {
    expect(mapPersonRoleToAppRole('Portfolio Director')).toBe('Portfolio Director')
    expect(mapPersonRoleToAppRole('Project Manager')).toBe('Project Manager')
    expect(mapPersonRoleToAppRole('Business Analyst')).toBe('PMO Analyst')
  })

  it('lists a stable capability set for PMO Analyst', () => {
    const caps = capabilitiesForRole('PMO Analyst')
    expect(caps).toContain('reports:export')
    expect(caps).not.toContain('approvals:decide')
  })
})
