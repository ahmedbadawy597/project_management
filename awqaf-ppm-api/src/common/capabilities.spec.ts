import { capabilitiesForRole, hasCapability } from './capabilities'

describe('capabilities', () => {
  it('gives director approvals:decide', () => {
    expect(hasCapability('Portfolio Director', 'approvals:decide')).toBe(true)
  })

  it('denies viewer projects:write', () => {
    expect(hasCapability('Executive Viewer', 'projects:write')).toBe(false)
  })

  it('denies pm approvals:decide', () => {
    expect(hasCapability('Project Manager', 'approvals:decide')).toBe(false)
  })

  it('returns all capabilities for director', () => {
    expect(capabilitiesForRole('Portfolio Director').length).toBeGreaterThan(15)
  })
})
