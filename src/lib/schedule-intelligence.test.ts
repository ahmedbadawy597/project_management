import { describe, expect, it } from 'vitest'
import {
  inferDeliveryStatus,
  inferMilestoneStatus,
  inferScheduleState,
  plannedProgressByDate,
} from './schedule-intelligence'

describe('schedule intelligence', () => {
  it('fills past windows to 100% Completed when progress is blank', () => {
    const s = inferScheduleState('2025-01-01', '2025-06-30', 0, new Date('2026-11-19'))
    expect(s.progress).toBe(100)
    expect(s.status).toBe('Completed')
    expect(s.barStatus).toBe('completed')
    expect(s.fromCalendar).toBe(true)
  })

  it('advances active windows by calendar when progress is blank', () => {
    const s = inferScheduleState('2026-01-01', '2026-12-31', 0, new Date('2026-07-01'))
    expect(s.progress).toBeGreaterThan(40)
    expect(s.progress).toBeLessThan(60)
    expect(s.status).toBe('In Progress')
    expect(s.barStatus).toBe('in_progress')
  })

  it('keeps future windows at 0 / To Do', () => {
    const s = inferScheduleState('2027-01-01', '2027-06-30', 0, new Date('2026-11-19'))
    expect(s.progress).toBe(0)
    expect(s.status).toBe('To Do')
    expect(s.barStatus).toBe('not_started')
  })

  it('lets reported progress win and marks delayed when past end incomplete', () => {
    const s = inferScheduleState('2025-01-01', '2025-06-30', 40, new Date('2026-11-19'))
    expect(s.progress).toBe(40)
    expect(s.fromCalendar).toBe(false)
    expect(s.barStatus).toBe('delayed')
    expect(s.status).toBe('In Progress')
  })

  it('marks overdue milestones Delayed', () => {
    expect(
      inferMilestoneStatus('2025-01-01', '2025-02-01', 'Upcoming', new Date('2026-11-19')),
    ).toBe('Delayed')
    expect(
      inferMilestoneStatus('2027-01-01', undefined, 'Upcoming', new Date('2026-11-19')),
    ).toBe('Upcoming')
  })

  it('promotes Planned delivery to Active once started', () => {
    expect(inferDeliveryStatus('2026-01-01', '2026-12-31', 'Planned', new Date('2026-06-01'))).toBe(
      'Active',
    )
    expect(inferDeliveryStatus('2027-01-01', '2027-12-31', 'Planned', new Date('2026-06-01'))).toBe(
      'Planned',
    )
  })

  it('planned progress hits 100 after end', () => {
    expect(plannedProgressByDate('2026-01-01', '2026-06-30', new Date('2026-07-01'))).toBe(100)
  })
})
