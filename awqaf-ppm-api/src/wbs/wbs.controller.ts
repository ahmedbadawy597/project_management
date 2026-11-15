import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import type { RequestUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { ApiSecured } from '../common/swagger'
import { UpdateTaskStatusDto, WbsItemDto } from '../common/swagger-dtos'
import { WbsService } from './wbs.service'

@ApiTags('WBS')
@Controller('wbs')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class WbsController {
  constructor(private readonly wbs: WbsService) {}

  @Get()
  @ApiSecured('List WBS / tasks')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [WbsItemDto] })
  list(@Query('projectId') projectId?: string) {
    return this.wbs.list(projectId)
  }

  @Post()
  @RequireCapabilities('tasks:write')
  @ApiSecured('Create WBS item', { forbidden: true })
  @ApiBody({ type: WbsItemDto })
  @ApiCreatedResponse({ type: WbsItemDto })
  create(@Body() body: Record<string, unknown>, @CurrentUser() user: RequestUser) {
    return this.wbs.upsert(body, user.personId)
  }

  @Put(':id')
  @RequireCapabilities('tasks:write')
  @ApiSecured('Update WBS item', { forbidden: true })
  @ApiBody({ type: WbsItemDto })
  @ApiOkResponse({ type: WbsItemDto })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.wbs.upsert({ ...body, id }, user.personId)
  }

  @Patch(':id/status')
  @RequireCapabilities('tasks:write')
  @ApiSecured('Update task status', { forbidden: true })
  @ApiOkResponse({ type: WbsItemDto })
  updateStatus(@Param('id') id: string, @Body() body: UpdateTaskStatusDto) {
    return this.wbs.updateStatus(id, body.status)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapabilities('tasks:write')
  @ApiSecured('Delete WBS item', { forbidden: true })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string) {
    await this.wbs.remove(id)
  }
}
