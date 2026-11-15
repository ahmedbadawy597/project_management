import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { HealthDto } from '../common/swagger-dtos'
import { ApiPublic } from '../common/swagger'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiPublic('Health check')
  @ApiOkResponse({ type: HealthDto })
  health() {
    return { status: 'ok' }
  }
}
