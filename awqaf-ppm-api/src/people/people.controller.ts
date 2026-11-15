import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { ApiSecured } from '../common/swagger'
import { PersonDto } from '../common/swagger-dtos'
import { CreatePersonDto, UpdatePersonDto } from './dto/person.dto'
import { PeopleService } from './people.service'

@ApiTags('People')
@Controller('people')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Get()
  @ApiSecured('List people / users')
  @ApiOkResponse({ type: [PersonDto] })
  list() {
    return this.people.list()
  }

  @Post()
  @RequireCapabilities('admin:view')
  @ApiSecured('Create user', { forbidden: true })
  @ApiCreatedResponse({ type: PersonDto })
  create(@Body() body: CreatePersonDto) {
    return this.people.create(body)
  }

  @Patch(':id')
  @RequireCapabilities('admin:view')
  @ApiSecured('Update user', { forbidden: true })
  @ApiOkResponse({ type: PersonDto })
  update(@Param('id') id: string, @Body() body: UpdatePersonDto) {
    return this.people.update(id, body)
  }
}
