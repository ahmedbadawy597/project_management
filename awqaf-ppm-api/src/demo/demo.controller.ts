import {
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import type { RequestUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { BootstrapService } from '../bootstrap/bootstrap.service'
import { CurrentUser } from '../common/current-user.decorator'
import { ApiSecured } from '../common/swagger'
import { BootstrapStateDto } from '../common/swagger-dtos'

@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly bootstrap: BootstrapService,
    private readonly config: ConfigService,
  ) {}

  @Post('reset')
  @UseGuards(JwtAuthGuard)
  @ApiSecured('Reset database to seed data (ENABLE_DEMO_RESET=true)')
  @ApiOkResponse({ type: BootstrapStateDto })
  reset(@CurrentUser() user: RequestUser) {
    if (this.config.get<string>('ENABLE_DEMO_RESET') !== 'true') {
      throw new ForbiddenException('Demo reset disabled')
    }
    return this.bootstrap.reset(user.personId, user.role)
  }
}
