import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger'
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator'
import type { RequestUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { ApiSecured } from '../common/swagger'
import { TicketsService } from './tickets.service'

class CreateTicketDto {
  @ApiProperty()
  @IsString()
  projectId!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appId?: string

  @ApiProperty({ example: 'Help' })
  @IsString()
  type!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string

  @ApiPropertyOptional({ example: 'Immediate' })
  @IsOptional()
  @IsString()
  urgency?: string

  @ApiPropertyOptional({ type: [String], example: ['NeedHelp', 'Immediate'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string
}

class CommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string
}

@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @RequireCapabilities('tasks:write')
  @ApiSecured('List tickets', { forbidden: true })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'appId', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'urgency', required: false })
  @ApiOkResponse({ description: 'Ticket list' })
  list(
    @CurrentUser() user: RequestUser,
    @Query('projectId') projectId?: string,
    @Query('appId') appId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: string,
    @Query('tag') tag?: string,
    @Query('urgency') urgency?: string,
  ) {
    return this.tickets.list(user.personId, user.role, {
      projectId,
      appId,
      assigneeId,
      status,
      tag,
      urgency,
    })
  }

  @Get(':id')
  @RequireCapabilities('tasks:write')
  @ApiSecured('Get ticket with comments', { forbidden: true })
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tickets.get(id, user.personId, user.role)
  }

  @Post()
  @RequireCapabilities('tasks:write')
  @ApiSecured('Create ticket', { forbidden: true })
  @ApiCreatedResponse({ description: 'Created ticket' })
  create(@Body() body: CreateTicketDto, @CurrentUser() user: RequestUser) {
    return this.tickets.create(user.personId, user.role, body)
  }

  @Patch(':id')
  @RequireCapabilities('tasks:write')
  @ApiSecured('Update ticket', { forbidden: true })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tickets.update(id, user.personId, user.role, body)
  }

  @Post(':id/comments')
  @RequireCapabilities('tasks:write')
  @ApiSecured('Add comment to ticket', { forbidden: true })
  comment(
    @Param('id') id: string,
    @Body() body: CommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tickets.addComment(id, user.personId, user.role, body.body)
  }
}
