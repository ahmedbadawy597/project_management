import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { ApiSecured } from '../common/swagger'
import { MilestoneDto } from '../common/swagger-dtos'
import { MilestonesService } from './milestones.service'

@ApiTags('Milestones')
@Controller('milestones')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get()
  @ApiSecured('List milestones')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [MilestoneDto] })
  list(@Query('projectId') projectId?: string) {
    return this.milestones.list(projectId)
  }

  @Put(':id')
  @RequireCapabilities('milestones:write')
  @ApiSecured('Upsert milestone', { forbidden: true })
  @ApiBody({ type: MilestoneDto })
  @ApiOkResponse({ type: MilestoneDto })
  upsert(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.milestones.upsert(id, body)
  }
}
