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
    expect(mapPersonRoleToAppRole('Business Analyst')).toBe('Business')
    expect(mapPersonRoleToAppRole('Developer')).toBe('Developer')
    expect(mapPersonRoleToAppRole('Lead Developer')).toBe('Developer')
  })

  it('lists a stable capability set for PMO Analyst', () => {
    const caps = capabilitiesForRole('PMO Analyst')
    expect(caps).toContain('reports:export')
    expect(caps).not.toContain('approvals:decide')
  })

  it('gives Developer and Business ticket access without admin', () => {
    expect(hasCapability('Developer', 'tasks:write')).toBe(true)
    expect(hasCapability('Developer', 'admin:view')).toBe(false)
    expect(hasCapability('Business', 'tasks:write')).toBe(true)
    expect(hasCapability('Business', 'admin:view')).toBe(false)
  })

  it('keeps Developer nav focused on joined delivery work', () => {
    const caps = capabilitiesForRole('Developer')
    expect(caps).toContain('projects:view')
    expect(caps).toContain('tasks:write')
    expect(caps).toContain('risks:write')
    expect(caps).toContain('notifications:view')
    expect(caps).not.toContain('milestones:write')
    expect(caps).not.toContain('documents:view')
    expect(caps).not.toContain('documents:upload')
    expect(caps).not.toContain('portfolio:view')
    expect(caps).not.toContain('resources:view')
    expect(caps).not.toContain('gantt:view')
    expect(caps).not.toContain('roadmap:view')
    expect(caps).not.toContain('executive:view')
  })
})
