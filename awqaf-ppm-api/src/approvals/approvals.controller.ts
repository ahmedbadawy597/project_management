import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { RequestUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { ApiSecured } from '../common/swagger'
import { ApprovalDto, DecideApprovalDto } from '../common/swagger-dtos'
import { ApprovalsService } from './approvals.service'

@ApiTags('Approvals')
@Controller('approvals')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @ApiSecured('List approvals')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [ApprovalDto] })
  list(@Query('projectId') projectId?: string) {
    return this.approvals.list(projectId)
  }

  @Post(':id/decide')
  @HttpCode(200)
  @RequireCapabilities('approvals:decide')
  @ApiSecured('Approve or reject a pending approval', { forbidden: true })
  @ApiOkResponse({ type: ApprovalDto })
  decide(
    @Param('id') id: string,
    @Body() body: DecideApprovalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.approvals.decide(id, body.status, user.personId, body.comment)
  }
}
