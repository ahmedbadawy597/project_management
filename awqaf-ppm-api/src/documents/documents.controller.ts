import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { RequestUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { ApiSecured } from '../common/swagger'
import { DocumentItemDto, UploadDocumentDto } from '../common/swagger-dtos'
import { DocumentsService } from './documents.service'

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiSecured('List documents (metadata)')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [DocumentItemDto] })
  list(@Query('projectId') projectId?: string) {
    return this.documents.list(projectId)
  }

  @Post()
  @RequireCapabilities('documents:upload')
  @ApiSecured('Upload document metadata', { forbidden: true })
  @ApiCreatedResponse({ type: DocumentItemDto })
  upload(@Body() body: UploadDocumentDto, @CurrentUser() user: RequestUser) {
    return this.documents.upload(body, user.personId)
  }
}
