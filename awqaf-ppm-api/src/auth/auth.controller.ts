import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/current-user.decorator'
import { AuthUserDto, LoginResponseDto, PersonaDto } from '../common/swagger-dtos'
import { ApiPublic, ApiSecured } from '../common/swagger'
import { AuthService } from './auth.service'
import type { RequestUser } from './auth.types'
import { ChangePasswordDto, LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './jwt-auth.guard'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiPublic('Sign in with username (or email) and password')
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password)
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiSecured('Change password (required on first login)')
  @ApiOkResponse({ type: AuthUserDto })
  changePassword(@Body() body: ChangePasswordDto, @CurrentUser() user: RequestUser) {
    return this.auth.changePassword(user.personId, body.currentPassword, body.newPassword)
  }

  @Get('personas')
  @ApiPublic('List official login account directory (metadata only)')
  @ApiOkResponse({ type: [PersonaDto] })
  personas() {
    return this.auth.personas()
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiSecured('Get current authenticated user')
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.personId, user.personaId)
  }
}
