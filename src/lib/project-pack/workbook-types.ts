import type {
  AppMember,
  Milestone,
  Person,
  Project,
  ProjectApp,
  Risk,
  WbsItem,
} from '@/data/types'

export type ExportPackInput = {
  project: Project
  apps: ProjectApp[]
  people: Person[]
  projectMemberIds: string[]
  appMembers: Record<string, AppMember[]>
  wbs: WbsItem[]
  milestones: Milestone[]
  risks: Risk[]
}
