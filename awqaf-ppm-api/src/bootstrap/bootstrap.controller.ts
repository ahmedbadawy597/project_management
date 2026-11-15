import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import type { RequestUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { ApiSecured } from '../common/swagger'
import { BootstrapStateDto } from '../common/swagger-dtos'
import { BootstrapService } from './bootstrap.service'

@ApiTags('Bootstrap')
@Controller()
export class BootstrapController {
  constructor(private readonly bootstrap: BootstrapService) {}

  @Get('bootstrap')
  @UseGuards(JwtAuthGuard)
  @ApiSecured('Load portfolio snapshot filtered by membership and app access')
  @ApiOkResponse({ type: BootstrapStateDto })
  snapshot(@CurrentUser() user: RequestUser) {
    return this.bootstrap.snapshot(user.personId, user.role)
  }
}
