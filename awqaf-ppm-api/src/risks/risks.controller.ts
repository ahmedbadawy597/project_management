import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { ApiSecured } from '../common/swagger'
import { RiskDto } from '../common/swagger-dtos'
import { RisksService } from './risks.service'

@ApiTags('Risks')
@Controller('risks')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class RisksController {
  constructor(private readonly risks: RisksService) {}

  @Get()
  @ApiSecured('List risks / issues')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [RiskDto] })
  list(@Query('projectId') projectId?: string) {
    return this.risks.list(projectId)
  }

  @Post()
  @RequireCapabilities('risks:write')
  @ApiSecured('Create risk', { forbidden: true })
  @ApiBody({ type: RiskDto })
  @ApiCreatedResponse({ type: RiskDto })
  create(@Body() body: Record<string, unknown>) {
    return this.risks.upsert(body)
  }

  @Put(':id')
  @RequireCapabilities('risks:write')
  @ApiSecured('Update risk', { forbidden: true })
  @ApiBody({ type: RiskDto })
  @ApiOkResponse({ type: RiskDto })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.risks.upsert({ ...body, id })
  }
}
