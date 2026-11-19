import { describe, expect, it } from 'vitest'
import type { ProjectApp, WbsItem } from '@/data/types'
import {
  computeAppDashboardMetrics,
  phaseBarStatus,
  plannedProgressByDate,
} from './app-dashboard-metrics'

const app: ProjectApp = {
  id: 'app-1',
  projectId: 'prj-1',
  code: 'APP-1',
  name: 'App One',
  nameAr: 'تطبيق ١',
  description: '',
  descriptionAr: '',
  status: 'Active',
  plannedStart: '2026-01-01',
  plannedEnd: '2026-06-30',
  userCount: 12,
  readiness: 0,
}

function wbs(partial: Partial<WbsItem> & Pick<WbsItem, 'id' | 'type' | 'name'>): WbsItem {
  return {
    projectId: 'prj-1',
    appId: 'app-1',
    nameAr: partial.name,
    start: '2026-01-01',
    end: '2026-03-01',
    baselineStart: '2026-01-01',
    baselineEnd: '2026-03-01',
    progress: 0,
    dependencies: [],
    status: 'To Do',
    ...partial,
  }
}

describe('app dashboard metrics', () => {
  it('computes weighted overall progress from phases', () => {
    const items = [
      wbs({ id: 'p1', type: 'phase', name: 'A', progress: 100, weightPct: 40, code: 'PH-A' }),
      wbs({ id: 'p2', type: 'phase', name: 'B', progress: 50, weightPct: 60, code: 'PH-B' }),
    ]
    const m = computeAppDashboardMetrics(app, items, new Date('2026-02-01'))
    expect(m.overallProgress).toBe(70)
    expect(m.phases).toHaveLength(2)
    expect(m.hasPlan).toBe(true)
  })

  it('rolls child task progress into phase when phase progress is 0', () => {
    const items = [
      wbs({ id: 'p1', type: 'phase', name: 'Build', progress: 0, weightPct: 100, code: 'PH-B' }),
      wbs({
        id: 't1',
        type: 'task',
        name: 'Task 1',
        parentId: 'p1',
        progress: 80,
      }),
      wbs({
        id: 't2',
        type: 'task',
        name: 'Task 2',
        parentId: 'p1',
        progress: 20,
      }),
    ]
    const m = computeAppDashboardMetrics(app, items)
    expect(m.phases[0].progress).toBe(50)
    expect(m.overallProgress).toBe(50)
  })

  it('computes delay days when past planned end and incomplete', () => {
    const items = [
      wbs({
        id: 'p1',
        type: 'phase',
        name: 'A',
        progress: 40,
        weightPct: 100,
        end: '2026-05-01',
      }),
    ]
    const m = computeAppDashboardMetrics(app, items, new Date('2026-07-10'))
    expect(m.delayDays).toBeGreaterThan(0)
  })

  it('marks phase status delayed / completed', () => {
    expect(phaseBarStatus(100, '2026-01-01', '2026-02-01', new Date('2026-03-01'))).toBe(
      'completed',
    )
    expect(phaseBarStatus(40, '2026-01-01', '2026-02-01', new Date('2026-03-01'))).toBe('delayed')
    expect(phaseBarStatus(0, '2026-06-01', '2026-07-01', new Date('2026-03-01'))).toBe(
      'not_started',
    )
  })

  it('planned progress follows calendar', () => {
    expect(plannedProgressByDate('2026-01-01', '2026-12-31', new Date('2026-01-01'))).toBe(0)
    expect(plannedProgressByDate('2026-01-01', '2026-12-31', new Date('2027-01-01'))).toBe(100)
  })
})
