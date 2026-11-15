import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger'
import { IsArray, IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { ApiSecured } from '../common/swagger'
import { MembersService } from './members.service'

class SetMembersDto {
  @ApiProperty({ type: [String], example: ['p-pm1', 'p-dev1'] })
  @IsArray()
  @IsString({ each: true })
  personIds!: string[]
}

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get(':id/members')
  @ApiSecured('List project team members')
  @ApiOkResponse({ description: 'Project team' })
  list(@Param('id') id: string) {
    return this.members.list(id)
  }

  @Put(':id/members')
  @RequireCapabilities('projects:write')
  @ApiSecured('Replace project team members', { forbidden: true })
  @ApiOkResponse({ description: 'Updated project team' })
  set(@Param('id') id: string, @Body() body: SetMembersDto) {
    return this.members.setMembers(id, body.personIds)
  }
}
