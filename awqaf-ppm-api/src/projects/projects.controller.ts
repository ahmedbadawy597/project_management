import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import type { RequestUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { ApiSecured } from '../common/swagger'
import { ProjectDto, UpdateProjectDto } from '../common/swagger-dtos'
import { CreateProjectDto } from './dto/create-project.dto'
import { ProjectsService } from './projects.service'

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiSecured('List projects')
  @ApiOkResponse({ type: [ProjectDto] })
  list() {
    return this.projects.list()
  }

  @Get(':id')
  @ApiSecured('Get project by id')
  @ApiOkResponse({ type: ProjectDto })
  get(@Param('id') id: string) {
    return this.projects.get(id)
  }

  @Post()
  @RequireCapabilities('projects:write')
  @ApiSecured('Create project', { forbidden: true })
  @ApiCreatedResponse({ type: ProjectDto })
  create(@Body() body: CreateProjectDto, @CurrentUser() user: RequestUser) {
    return this.projects.create(body, user.personId)
  }

  @Patch(':id')
  @RequireCapabilities('projects:write')
  @ApiSecured('Update project', { forbidden: true })
  @ApiOkResponse({ type: ProjectDto })
  update(@Param('id') id: string, @Body() body: UpdateProjectDto) {
    return this.projects.update(id, body as Record<string, unknown>)
  }
}
