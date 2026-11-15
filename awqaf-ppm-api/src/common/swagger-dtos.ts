import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { APP_MEMBER_ROLES } from './access.service'

export class AppMemberInputDto {
  @ApiProperty()
  @IsString()
  personId!: string

  @ApiProperty({ enum: APP_MEMBER_ROLES })
  @IsIn([...APP_MEMBER_ROLES])
  role!: string
}

export class MessageDto {
  @ApiProperty({ example: 'Not found' })
  message!: string
}

export class AuthUserDto {
  @ApiProperty({ example: 'p-admin' })
  id!: string

  @ApiProperty({ example: 'admin' })
  personaId!: string

  @ApiProperty({ example: 'Ahmed Badawy' })
  name!: string

  @ApiProperty({ example: 'أحمد بدوي' })
  nameAr!: string

  @ApiProperty({ example: 'ahmed.badawy@awqaf.gov.sa' })
  email!: string

  @ApiProperty({ example: 'ahmed.badawy' })
  username!: string

  @ApiProperty({ example: 'Portfolio Director' })
  role!: string

  @ApiProperty({ type: [String], example: ['projects:write', 'approvals:decide'] })
  capabilities!: string[]

  @ApiProperty({ example: true })
  mustChangePassword!: boolean
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token!: string

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto
}

export class PersonaDto {
  @ApiProperty({ example: 'admin' })
  id!: string

  @ApiProperty({ example: 'p-admin' })
  personId!: string

  @ApiProperty({ example: 'Ahmed Badawy' })
  label!: string

  @ApiProperty({ example: 'أحمد بدوي' })
  labelAr!: string

  @ApiProperty({ example: 'Portfolio Director' })
  role!: string

  @ApiProperty()
  description!: string
}

export class HealthDto {
  @ApiProperty({ example: 'ok' })
  status!: string
}

export class ProjectDto {
  @ApiProperty({ example: 'prj-001' })
  id!: string

  @ApiProperty({ example: 'AWQ-APP-001' })
  code!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  nameAr!: string

  @ApiProperty()
  description!: string

  @ApiProperty()
  descriptionAr!: string

  @ApiProperty({ example: 'p-pm1' })
  managerId!: string

  @ApiProperty({ example: 'Active' })
  status!: string

  @ApiProperty({ example: 65 })
  plannedProgress!: number

  @ApiProperty({ example: 48 })
  actualProgress!: number

  @ApiProperty({ example: '2026-03-01' })
  plannedStart!: string

  @ApiProperty({ example: '2026-12-15' })
  plannedEnd!: string

  @ApiProperty({ example: '2027-01-20' })
  forecastEnd!: string

  @ApiPropertyOptional({ example: '2026-03-05' })
  actualStart?: string

  @ApiProperty()
  phase!: string

  @ApiProperty()
  budgetApproved!: number

  @ApiProperty()
  budgetAllocated!: number

  @ApiProperty()
  budgetSpent!: number

  @ApiProperty()
  slaCompliance!: number

  @ApiProperty({ example: 'High' })
  riskLevel!: string

  @ApiProperty()
  summary!: string

  @ApiProperty()
  summaryAr!: string

  @ApiProperty()
  managerUpdate!: string

  @ApiProperty()
  managerUpdateAr!: string

  @ApiProperty()
  charter!: string

  @ApiProperty()
  charterAr!: string
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string

  @ApiPropertyOptional({ example: 'Active' })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  plannedProgress?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  actualProgress?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plannedStart?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plannedEnd?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forecastEnd?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phase?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  budgetApproved?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riskLevel?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summaryAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerUpdate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerUpdateAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  charter?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  charterAr?: string
}

export class ProjectAppDto {
  @ApiProperty({ example: 'app-001' })
  id!: string

  @ApiProperty({ example: 'prj-001' })
  projectId!: string

  @ApiProperty()
  code!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  nameAr!: string

  @ApiProperty()
  description!: string

  @ApiProperty()
  descriptionAr!: string

  @ApiPropertyOptional()
  ownerId?: string

  @ApiProperty({ example: 'Active' })
  status!: string

  @ApiProperty()
  plannedStart!: string

  @ApiProperty()
  plannedEnd!: string

  @ApiPropertyOptional({ example: 'https://services.awqaf.gov.sa' })
  url?: string

  @ApiPropertyOptional({ example: 1200 })
  userCount?: number

  @ApiPropertyOptional({ example: 90 })
  readiness?: number

  @ApiPropertyOptional({ example: '#0F766E' })
  iconColor?: string

  @ApiPropertyOptional({ example: 'Published' })
  publishStatus?: string

  @ApiPropertyOptional()
  featured?: boolean

  @ApiPropertyOptional({ example: 1 })
  sortOrder?: number
}

export class UpsertAppDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ example: 'prj-001' })
  @IsString()
  projectId!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  code!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string

  @ApiPropertyOptional({ example: 'Planned' })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plannedStart?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plannedEnd?: string

  @ApiPropertyOptional({ type: [AppMemberInputDto], description: 'App team with roles' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppMemberInputDto)
  members?: AppMemberInputDto[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  userCount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  readiness?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconColor?: string

  @ApiPropertyOptional({ example: 'Published' })
  @IsOptional()
  @IsString()
  publishStatus?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class PersonDto {
  @ApiProperty({ example: 'p-pm1' })
  id!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  nameAr!: string

  @ApiProperty()
  role!: string

  @ApiProperty({ example: 'Project Manager' })
  appRole!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  department!: string

  @ApiProperty()
  allocation!: number

  @ApiProperty()
  availability!: number

  @ApiProperty({ example: true })
  active!: boolean

  @ApiProperty({ type: [String], example: ['prj-001'] })
  projectIds!: string[]
}

export class WbsItemDto {
  @ApiProperty({ example: 'wbs-001' })
  id!: string

  @ApiProperty()
  projectId!: string

  @ApiPropertyOptional()
  parentId?: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  nameAr!: string

  @ApiProperty({ example: 'task' })
  type!: string

  @ApiProperty()
  start!: string

  @ApiProperty()
  end!: string

  @ApiProperty()
  baselineStart!: string

  @ApiProperty()
  baselineEnd!: string

  @ApiProperty()
  progress!: number

  @ApiProperty({ type: [String] })
  dependencies!: string[]

  @ApiPropertyOptional()
  assigneeId?: string

  @ApiPropertyOptional()
  critical?: boolean

  @ApiProperty({ example: 'In Progress' })
  status!: string

  @ApiPropertyOptional()
  priority?: string

  @ApiPropertyOptional()
  estimatedHours?: number

  @ApiPropertyOptional()
  actualHours?: number

  @ApiPropertyOptional()
  description?: string
}

export class UpdateTaskStatusDto {
  @ApiProperty({
    example: 'In Progress',
    enum: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Blocked', 'Completed'],
  })
  @IsString()
  @IsIn(['Backlog', 'To Do', 'In Progress', 'In Review', 'Blocked', 'Completed'])
  status!: string
}

export class MilestoneDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  projectId!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  nameAr!: string

  @ApiProperty()
  ownerId!: string

  @ApiProperty()
  baselineDate!: string

  @ApiProperty()
  forecastDate!: string

  @ApiPropertyOptional()
  actualDate?: string

  @ApiProperty()
  status!: string

  @ApiProperty({ type: [String] })
  dependencies!: string[]

  @ApiProperty({ type: [String] })
  deliverables!: string[]

  @ApiProperty({ type: [String] })
  deliverablesAr!: string[]
}

export class RiskDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  projectId!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  titleAr!: string

  @ApiProperty()
  ownerId!: string

  @ApiProperty({ example: 3 })
  probability!: number

  @ApiProperty({ example: 4 })
  impact!: number

  @ApiProperty({ example: 'High' })
  severity!: string

  @ApiProperty()
  mitigation!: string

  @ApiProperty()
  mitigationAr!: string

  @ApiProperty()
  targetDate!: string

  @ApiProperty({ example: 'Open' })
  status!: string

  @ApiProperty({ example: 'risk' })
  type!: string

  @ApiPropertyOptional()
  overdue?: boolean
}

export class SlaRecordDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  reference!: string

  @ApiProperty()
  projectId!: string

  @ApiProperty()
  category!: string

  @ApiProperty()
  managerId!: string

  @ApiProperty()
  targetHours!: number

  @ApiProperty()
  consumedHours!: number

  @ApiProperty()
  compliance!: number

  @ApiProperty()
  status!: string

  @ApiProperty()
  warningThreshold!: number

  @ApiProperty()
  openedAt!: string

  @ApiProperty()
  dueAt!: string

  @ApiProperty()
  escalationCount!: number
}

export class BudgetTransactionDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  projectId!: string

  @ApiProperty()
  date!: string

  @ApiProperty()
  category!: string

  @ApiProperty()
  description!: string

  @ApiProperty()
  amount!: number

  @ApiProperty({ example: 'expense', enum: ['expense', 'allocation', 'adjustment'] })
  type!: string
}

export class ApprovalCommentDto {
  @ApiProperty()
  authorId!: string

  @ApiProperty()
  text!: string

  @ApiProperty()
  at!: string
}

export class ApprovalDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  projectId!: string

  @ApiProperty()
  type!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  titleAr!: string

  @ApiProperty()
  requesterId!: string

  @ApiProperty({ example: 'Pending' })
  status!: string

  @ApiProperty()
  submittedAt!: string

  @ApiPropertyOptional()
  decidedAt?: string

  @ApiProperty({ type: [ApprovalCommentDto] })
  comments!: ApprovalCommentDto[]
}

export class DecideApprovalDto {
  @ApiProperty({ enum: ['Approved', 'Rejected'] })
  @IsIn(['Approved', 'Rejected'])
  status!: 'Approved' | 'Rejected'

  @ApiPropertyOptional({ description: 'Required when status is Rejected' })
  @IsOptional()
  @IsString()
  comment?: string
}

export class DocumentItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  projectId!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  category!: string

  @ApiProperty()
  uploadedBy!: string

  @ApiProperty()
  uploadedAt!: string

  @ApiProperty()
  size!: string

  @ApiProperty()
  version!: string
}

export class UploadDocumentDto {
  @ApiProperty()
  @IsString()
  projectId!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  category!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string
}

export class ActivityItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  projectId!: string

  @ApiProperty()
  type!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  titleAr!: string

  @ApiProperty()
  actorId!: string

  @ApiProperty()
  at!: string
}

export class NotificationItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  titleAr!: string

  @ApiProperty()
  body!: string

  @ApiProperty()
  bodyAr!: string

  @ApiProperty()
  at!: string

  @ApiProperty()
  read!: boolean

  @ApiPropertyOptional()
  href?: string
}

export class BootstrapStateDto {
  @ApiProperty({ type: [ProjectDto] })
  projects!: ProjectDto[]

  @ApiProperty({ type: [PersonDto] })
  people!: PersonDto[]

  @ApiProperty({ type: [WbsItemDto] })
  wbs!: WbsItemDto[]

  @ApiProperty({ type: [MilestoneDto] })
  milestones!: MilestoneDto[]

  @ApiProperty({ type: [SlaRecordDto] })
  slas!: SlaRecordDto[]

  @ApiProperty({ type: [RiskDto] })
  risks!: RiskDto[]

  @ApiProperty({ type: [BudgetTransactionDto] })
  transactions!: BudgetTransactionDto[]

  @ApiProperty({ type: [ApprovalDto] })
  approvals!: ApprovalDto[]

  @ApiProperty({ type: [DocumentItemDto] })
  documents!: DocumentItemDto[]

  @ApiProperty({ type: [ActivityItemDto] })
  activities!: ActivityItemDto[]

  @ApiProperty({ type: [NotificationItemDto] })
  notifications!: NotificationItemDto[]

  @ApiProperty({ type: [ProjectAppDto] })
  apps!: ProjectAppDto[]
}
