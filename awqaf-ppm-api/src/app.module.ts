import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ActivitiesController } from './activities/activities.controller'
import { ApprovalsController } from './approvals/approvals.controller'
import { ApprovalsService } from './approvals/approvals.service'
import { AppMembersController } from './apps/app-members.controller'
import { AppMembersService } from './apps/app-members.service'
import { AppsController } from './apps/apps.controller'
import { AppsService } from './apps/apps.service'
import { AuthModule } from './auth/auth.module'
import { BootstrapController } from './bootstrap/bootstrap.controller'
import { BootstrapService } from './bootstrap/bootstrap.service'
import { AccessService } from './common/access.service'
import { DemoController } from './demo/demo.controller'
import { SeedService } from './demo/seed.service'
import { DocumentsController } from './documents/documents.controller'
import { DocumentsService } from './documents/documents.service'
import { HealthController } from './health/health.controller'
import { MilestonesController } from './milestones/milestones.controller'
import { MilestonesService } from './milestones/milestones.service'
import { NotificationsController } from './notifications/notifications.controller'
import { NotificationsService } from './notifications/notifications.service'
import { PeopleController } from './people/people.controller'
import { PeopleService } from './people/people.service'
import { PrismaModule } from './prisma/prisma.module'
import { MembersController } from './projects/members.controller'
import { MembersService } from './projects/members.service'
import { ProjectsController } from './projects/projects.controller'
import { ProjectsService } from './projects/projects.service'
import { RisksController } from './risks/risks.controller'
import { RisksService } from './risks/risks.service'
import { SlasController } from './slas/slas.controller'
import { TicketsController } from './tickets/tickets.controller'
import { TicketsService } from './tickets/tickets.service'
import { TransactionsController } from './transactions/transactions.controller'
import { TransactionsService } from './transactions/transactions.service'
import { WbsController } from './wbs/wbs.controller'
import { WbsService } from './wbs/wbs.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    HealthController,
    BootstrapController,
    DemoController,
    MembersController,
    ProjectsController,
    AppMembersController,
    AppsController,
    TicketsController,
    PeopleController,
    WbsController,
    MilestonesController,
    RisksController,
    SlasController,
    TransactionsController,
    ApprovalsController,
    DocumentsController,
    ActivitiesController,
    NotificationsController,
  ],
  providers: [
    AccessService,
    SeedService,
    BootstrapService,
    ProjectsService,
    MembersService,
    AppsService,
    AppMembersService,
    TicketsService,
    PeopleService,
    WbsService,
    MilestonesService,
    RisksService,
    TransactionsService,
    ApprovalsService,
    DocumentsService,
    NotificationsService,
  ],
})
export class AppModule {}
