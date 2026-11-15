import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { mapActivity } from '../common/mappers'
import { ApiSecured } from '../common/swagger'
import { ActivityItemDto } from '../common/swagger-dtos'
import { PrismaService } from '../prisma/prisma.service'

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiSecured('List activity feed')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [ActivityItemDto] })
  async list(@Query('projectId') projectId?: string) {
    const rows = await this.prisma.activityItem.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { at: 'desc' },
    })
    return rows.map(mapActivity)
  }
}
