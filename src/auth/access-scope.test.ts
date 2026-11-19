import { describe, expect, it } from 'vitest'
import { canAccessTicket, resolveAccessScope } from './access-scope'

const maps = {
  projects: [
    { id: 'prj-a', managerId: 'p-pm1' },
    { id: 'prj-b', managerId: 'p-pm2' },
  ],
  apps: [
    { id: 'app-1', projectId: 'prj-a', ownerId: 'p-pm1' },
    { id: 'app-2', projectId: 'prj-a' },
    { id: 'app-3', projectId: 'prj-b' },
  ],
  projectMembers: {
    'prj-a': ['p-pm1', 'p-dev1'],
    'prj-b': ['p-pm2', 'p-dev2'],
  },
  appMembers: {
    'app-1': [
      { personId: 'p-pm1', role: 'AppManager' },
      { personId: 'p-dev1', role: 'Developer' },
    ],
    'app-2': [{ personId: 'p-dev2', role: 'Developer' }],
    'app-3': [{ personId: 'p-dev2', role: 'Developer' }],
  },
  appAccess: {
    'app-1': ['p-pm1', 'p-dev1'],
    'app-2': ['p-dev2'],
    'app-3': ['p-dev2'],
  },
  people: [
    { id: 'p-dev1', projectIds: ['prj-a'] },
    { id: 'p-dev2', projectIds: ['prj-b'] },
  ],
}

describe('access-scope', () => {
  it('gives Portfolio Director full access', () => {
    const scope = resolveAccessScope('p-admin', 'Portfolio Director', maps)
    expect(scope.mode).toBe('all')
    expect(scope.appIds.has('app-3')).toBe(true)
  })

  it('limits Developer to joined apps and their projects', () => {
    const scope = resolveAccessScope('p-dev1', 'Developer', maps)
    expect(scope.mode).toBe('scoped')
    expect([...scope.appIds].sort()).toEqual(['app-1'])
    expect(scope.projectIds.has('prj-a')).toBe(true)
    expect(scope.projectIds.has('prj-b')).toBe(false)
    expect(canAccessTicket(scope, { projectId: 'prj-a', appId: 'app-1' })).toBe(true)
    expect(canAccessTicket(scope, { projectId: 'prj-a', appId: 'app-2' })).toBe(false)
  })

  it('gives Project Manager full portfolio access like Portfolio Director', () => {
    const scope = resolveAccessScope('p-pm1', 'Project Manager', maps)
    expect(scope.mode).toBe('all')
    expect(scope.appIds.has('app-1')).toBe(true)
    expect(scope.appIds.has('app-2')).toBe(true)
    expect(scope.appIds.has('app-3')).toBe(true)
  })
})
