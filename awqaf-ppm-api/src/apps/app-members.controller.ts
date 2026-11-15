import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { APP_MEMBER_ROLES } from '../common/access.service'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { ApiSecured } from '../common/swagger'
import { AppMembersService } from './app-members.service'

class MemberDto {
  @ApiProperty()
  @IsString()
  personId!: string

  @ApiProperty({ enum: APP_MEMBER_ROLES })
  @IsIn([...APP_MEMBER_ROLES])
  role!: string
}

class SetAppMembersDto {
  @ApiProperty({ type: [MemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberDto)
  members!: MemberDto[]
}

@ApiTags('Apps')
@Controller('apps')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class AppMembersController {
  constructor(private readonly members: AppMembersService) {}

  @Get(':id/members')
  @ApiSecured('List app team members with roles')
  @ApiOkResponse({ description: 'App team' })
  list(@Param('id') id: string) {
    return this.members.list(id)
  }

  @Put(':id/members')
  @RequireCapabilities('projects:write')
  @ApiSecured('Set app team members and roles', { forbidden: true })
  @ApiOkResponse({ description: 'Updated app team' })
  set(@Param('id') id: string, @Body() body: SetAppMembersDto) {
    return this.members.setMembers(id, body.members)
  }
}
