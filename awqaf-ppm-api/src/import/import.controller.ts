import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { CurrentUser } from '../common/current-user.decorator'
import type { RequestUser } from '../auth/auth.types'
import { ApiSecured } from '../common/swagger'
import { ImportService } from './import.service'
import type { ParsedProjectPack } from './project-pack.types'

@ApiTags('Import')
@Controller('import')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post('project-pack')
  @RequireCapabilities('projects:write')
  @ApiSecured('Import Excel project pack (parsed JSON)', { forbidden: true })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pack: { type: 'object', description: 'Parsed Project Pack from the Excel template' },
      },
      required: ['pack'],
    },
  })
  @ApiOkResponse({ description: 'Import summary or validation issues' })
  importProjectPack(
    @Body() body: { pack: ParsedProjectPack },
    @CurrentUser() user: RequestUser,
  ) {
    return this.imports.importProjectPack(body.pack, user.personId)
  }
}
