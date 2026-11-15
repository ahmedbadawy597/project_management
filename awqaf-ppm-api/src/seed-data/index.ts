import { projects } from './projects'
import { people } from './people'
import { wbs } from './wbs'
import { milestones } from './milestones'
import { slas } from './slas'
import { risks } from './risks'
import { transactions } from './transactions'
import { approvals } from './approvals'
import { documents } from './documents'
import { activities } from './activities'
import { notifications } from './notifications'
import { apps } from './apps'
import type { AppState } from './types'

export const seedState: Omit<AppState, 'language' | 'sidebarCollapsed' | 'currentUserId'> = {
  projects,
  people,
  wbs,
  milestones,
  slas,
  risks,
  transactions,
  approvals,
  documents,
  activities,
  notifications,
  apps,
}

export { DEMO_TODAY } from './projects'
