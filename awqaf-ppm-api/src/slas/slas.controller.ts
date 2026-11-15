import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { mapSla } from '../common/mappers'
import { ApiSecured } from '../common/swagger'
import { SlaRecordDto } from '../common/swagger-dtos'
import { PrismaService } from '../prisma/prisma.service'

@ApiTags('SLAs')
@Controller('slas')
@UseGuards(JwtAuthGuard)
export class SlasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiSecured('List SLA records')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [SlaRecordDto] })
  async list(@Query('projectId') projectId?: string) {
    const rows = await this.prisma.slaRecord.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { id: 'asc' },
    })
    return rows.map(mapSla)
  }
}
