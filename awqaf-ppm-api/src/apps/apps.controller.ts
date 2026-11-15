import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { IsArray, IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { ApiSecured } from '../common/swagger'
import { ProjectAppDto, UpsertAppDto } from '../common/swagger-dtos'
import { AppsService } from './apps.service'

class ReorderAppsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  orderedIds!: string[]
}

@ApiTags('Apps')
@Controller('apps')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class AppsController {
  constructor(private readonly apps: AppsService) {}

  @Get()
  @ApiSecured('List project apps/modules')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [ProjectAppDto] })
  list(@Query('projectId') projectId?: string) {
    return this.apps.list(projectId)
  }

  @Post()
  @RequireCapabilities('projects:write')
  @ApiSecured('Create app', { forbidden: true })
  @ApiCreatedResponse({ type: ProjectAppDto })
  create(@Body() body: UpsertAppDto) {
    return this.apps.create(body as unknown as Record<string, unknown>)
  }

  @Put('reorder')
  @RequireCapabilities('projects:write')
  @ApiSecured('Reorder apps catalog', { forbidden: true })
  @ApiOkResponse({ type: [ProjectAppDto] })
  reorder(@Body() body: ReorderAppsDto) {
    return this.apps.reorder(body.orderedIds ?? [])
  }

  @Put(':id')
  @RequireCapabilities('projects:write')
  @ApiSecured('Update app', { forbidden: true })
  @ApiOkResponse({ type: ProjectAppDto })
  upsert(@Param('id') id: string, @Body() body: UpsertAppDto) {
    return this.apps.upsert(id, body as unknown as Record<string, unknown>)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapabilities('projects:write')
  @ApiSecured('Delete app', { forbidden: true })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string) {
    await this.apps.remove(id)
  }
}
