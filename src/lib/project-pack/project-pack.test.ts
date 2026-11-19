import { describe, expect, it } from 'vitest'
import { people } from '@/data/seed/people'
import {
  buildEmptyTemplateWorkbook,
  buildSampleWorkbook,
  parseProjectPack,
  validateProjectPack,
  isBlockingIssue,
  workbookToArrayBuffer,
  applyProjectPack,
} from './index'
import type { Milestone, Person, Project, ProjectApp, Risk, WbsItem } from '@/data/types'
import type { AppMemberRole } from '@/data/types'

describe('project pack workbook', () => {
  it('builds branded empty template that parses', async () => {
    const buf = await workbookToArrayBuffer(await buildEmptyTemplateWorkbook())
    const { pack, issues } = parseProjectPack(buf)
    expect(issues.filter((i) => i.message.startsWith('Missing'))).toHaveLength(0)
    expect(pack?.project.project_code).toBe('AWQAF-NEW')
    expect(pack?.apps.length).toBeGreaterThanOrEqual(2)
    // multi-app example: aya on 3 apps
    const aya = pack?.team.filter((t) => t.person_email.startsWith('aya.hassin'))
    expect(aya?.length).toBeGreaterThanOrEqual(3)
  })

  it('builds Phase1 sample with plan sheets from timeline', async () => {
    const buf = await workbookToArrayBuffer(await buildSampleWorkbook())
    const { pack } = parseProjectPack(buf)
    expect(pack?.project.project_code).toBe('AWQAF-GIS-P1')
    expect(pack?.apps.map((a) => a.app_code).sort()).toEqual(
      ['GEO-GOV', 'GIS-UNIT', 'SPATIAL-RESPONSE'].sort(),
    )
    expect(pack?.plans).toHaveLength(3)
    expect(pack?.plans.every((p) => p.rows.some((r) => r.section === 'schedule'))).toBe(true)
    const multi = pack?.team.filter((t) => t.person_email === 'aya.hassin@awqaf.gov.sa')
    expect(multi?.map((t) => t.app_code).sort()).toEqual(
      ['GEO-GOV', 'GIS-UNIT', 'SPATIAL-RESPONSE'].sort(),
    )
  })

  it('validates known emails and applies upserts', async () => {
    const buf = await workbookToArrayBuffer(await buildSampleWorkbook())
    const { pack } = parseProjectPack(buf)
    expect(pack).toBeTruthy()
    const issues = validateProjectPack(pack!, { people: people as Person[] })
    expect(issues.filter(isBlockingIssue)).toHaveLength(0)

    const projects: Project[] = []
    const apps: ProjectApp[] = []
    const wbs: WbsItem[] = []
    const milestones: Milestone[] = []
    const risks: Risk[] = []
    const projectMembers: Record<string, string[]> = {}
    const appMembers: Record<string, Array<{ personId: string; role: AppMemberRole }>> = {}

    const summary = applyProjectPack(pack!, 'p-admin', {
      people: people as Person[],
      findProjectByCode: (code) => projects.find((p) => p.code === code),
      findAppByCode: (projectId, code) =>
        apps.find((a) => a.projectId === projectId && a.code === code),
      upsertProject: (project) => {
        const i = projects.findIndex((p) => p.id === project.id)
        if (i >= 0) projects[i] = project
        else projects.push(project)
      },
      upsertApp: (app) => {
        const i = apps.findIndex((a) => a.id === app.id)
        if (i >= 0) apps[i] = app
        else apps.push(app)
      },
      setProjectMembers: (id, ids) => {
        projectMembers[id] = ids
      },
      setAppMembers: (id, members) => {
        appMembers[id] = members
      },
      upsertWbs: (item) => {
        const i = wbs.findIndex((w) => w.id === item.id)
        if (i >= 0) wbs[i] = item
        else wbs.push(item)
      },
      upsertMilestone: (m) => {
        const i = milestones.findIndex((x) => x.id === m.id)
        if (i >= 0) milestones[i] = m
        else milestones.push(m)
      },
      upsertRisk: (r) => {
        const i = risks.findIndex((x) => x.id === r.id)
        if (i >= 0) risks[i] = r
        else risks.push(r)
      },
    })

    expect(summary.created).toBe(true)
    expect(summary.apps).toBe(3)
    expect(projects).toHaveLength(1)
    expect(apps).toHaveLength(3)
    expect(wbs.length).toBeGreaterThan(20)
    expect(milestones.length).toBe(6)
    expect(risks.length).toBe(3)
    // aya on three apps
    const ayaId = people.find((p) => p.email.startsWith('aya.hassin'))!.id
    const appsWithAya = Object.values(appMembers).filter((list) => list.some((m) => m.personId === ayaId))
    expect(appsWithAya.length).toBe(3)
  })
})
