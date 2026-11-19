import { capabilitiesForRole, hasCapability } from './capabilities'

describe('capabilities', () => {
  it('gives director approvals:decide', () => {
    expect(hasCapability('Portfolio Director', 'approvals:decide')).toBe(true)
  })

  it('denies viewer projects:write', () => {
    expect(hasCapability('Executive Viewer', 'projects:write')).toBe(false)
  })

  it('gives Project Manager the same capabilities as Portfolio Director', () => {
    expect(hasCapability('Project Manager', 'approvals:decide')).toBe(true)
    expect(hasCapability('Project Manager', 'admin:view')).toBe(true)
    expect(hasCapability('Project Manager', 'budget:adjust')).toBe(true)
    expect(capabilitiesForRole('Project Manager')).toEqual(
      capabilitiesForRole('Portfolio Director'),
    )
  })

  it('returns all capabilities for director', () => {
    expect(capabilitiesForRole('Portfolio Director').length).toBeGreaterThan(15)
  })
})
