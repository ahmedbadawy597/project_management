import { describe, expect, it } from 'vitest'
import {
  deriveHealth,
  executiveInsights,
  monthlyMilestoneCompletion,
  scheduleVariance,
  spi,
  type DomainState,
} from './selectors'
import type { Milestone, Person, Project as ProjectType } from './types'

function project(partial: Partial<ProjectType> & Pick<ProjectType, 'id' | 'status'>): ProjectType {
  return {
    code: 'AWQ-APP-001',
    name: 'Test',
    nameAr: 'اختبار',
    description: '',
    descriptionAr: '',
    managerId: 'p-pm1',
    plannedProgress: 50,
    actualProgress: 50,
    plannedStart: '2026-01-01',
    plannedEnd: '2026-12-01',
    forecastEnd: '2026-12-01',
    phase: 'Build',
    budgetApproved: 100,
    budgetAllocated: 100,
    budgetSpent: 10,
    slaCompliance: 90,
    riskLevel: 'Low',
    summary: '',
    summaryAr: '',
    managerUpdate: '',
    managerUpdateAr: '',
    charter: '',
    charterAr: '',
    ...partial,
  }
}

const emptyState = (): DomainState => ({
  projects: [],
  people: [],
  wbs: [],
  milestones: [],
  slas: [],
  risks: [],
  transactions: [],
  approvals: [],
  documents: [],
  activities: [],
  notifications: [],
})

describe('deriveHealth', () => {
  it('marks completed and planned correctly', () => {
    expect(deriveHealth(project({ id: '1', status: 'Completed' }))).toBe('Completed')
    expect(deriveHealth(project({ id: '2', status: 'Planned' }))).toBe('Not Started')
  })

  it('marks delayed when variance is severe', () => {
    expect(
      deriveHealth(
        project({
          id: '3',
          status: 'Active',
          plannedProgress: 60,
          actualProgress: 40,
        }),
      ),
    ).toBe('Delayed')
  })

  it('marks at risk for high risk level with moderate variance', () => {
    expect(
      deriveHealth(
        project({
          id: '4',
          status: 'Active',
          plannedProgress: 50,
          actualProgress: 46,
          riskLevel: 'High',
        }),
      ),
    ).toBe('At Risk')
  })
})

describe('spi / variance', () => {
  it('computes schedule variance and spi', () => {
    const p = project({ id: '5', status: 'Active', plannedProgress: 50, actualProgress: 40 })
    expect(scheduleVariance(p)).toBe(-10)
    expect(spi(p)).toBe(0.8)
  })
})

describe('executiveInsights', () => {
  it('counts overallocated people and planned initiation candidates from data', () => {
    const state = emptyState()
    state.people = [
      {
        id: 'p1',
        name: 'A',
        nameAr: 'أ',
        role: 'Solution Architect',
        email: 'a@x',
        department: 'Arch',
        allocation: 110,
        availability: 0,
        projectIds: [],
      } satisfies Person,
    ]
    state.projects = [
      project({ id: 'p-new', status: 'Planned', plannedProgress: 0 }),
      project({ id: 'p-old', status: 'Planned', plannedProgress: 10 }),
    ]
    const insights = executiveInsights(state)
    expect(insights.resourcePlanningNeeded).toBe(1)
    expect(insights.readyForInitiation.map((p) => p.id)).toEqual(['p-new'])
  })
})

describe('monthlyMilestoneCompletion', () => {
  it('does not invent completed counts when none exist', () => {
    const state = emptyState()
    state.milestones = [
      {
        id: 'm1',
        projectId: 'p1',
        name: 'M',
        nameAr: 'م',
        ownerId: 'p1',
        baselineDate: '2026-10-01',
        forecastDate: '2026-10-15',
        status: 'Upcoming',
        dependencies: [],
        deliverables: [],
      } satisfies Milestone,
    ]
    const rows = monthlyMilestoneCompletion(state)
    expect(rows.find((r) => r.month === 'Oct')?.completed).toBe(0)
    expect(rows.find((r) => r.month === 'Oct')?.planned).toBe(1)
  })

  it('counts actual completions by month', () => {
    const state = emptyState()
    state.milestones = [
      {
        id: 'm1',
        projectId: 'p1',
        name: 'M',
        nameAr: 'م',
        ownerId: 'p1',
        baselineDate: '2026-07-01',
        forecastDate: '2026-07-01',
        actualDate: '2026-07-10',
        status: 'Completed',
        dependencies: [],
        deliverables: [],
      } satisfies Milestone,
    ]
    expect(monthlyMilestoneCompletion(state).find((r) => r.month === 'Jul')?.completed).toBe(1)
  })
})

describe('open critical risks affect health', () => {
  it('delays active project when open critical risks are present', () => {
    const p = project({
      id: '6',
      status: 'Active',
      plannedProgress: 50,
      actualProgress: 50,
      riskLevel: 'Low',
    })
    expect(deriveHealth(p, 1)).toBe('Delayed')
  })
})
