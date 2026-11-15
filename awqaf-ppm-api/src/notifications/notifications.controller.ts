import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ApiSecured } from '../common/swagger'
import { NotificationItemDto } from '../common/swagger-dtos'
import { NotificationsService } from './notifications.service'

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiSecured('List notifications')
  @ApiOkResponse({ type: [NotificationItemDto] })
  list() {
    return this.notifications.list()
  }

  @Post('read-all')
  @ApiSecured('Mark all notifications as read')
  @ApiOkResponse({ type: [NotificationItemDto] })
  markAllRead() {
    return this.notifications.markAllRead()
  }

  @Post(':id/read')
  @ApiSecured('Mark one notification as read')
  @ApiOkResponse({ type: NotificationItemDto })
  markRead(@Param('id') id: string) {
    return this.notifications.markRead(id)
  }
}
