import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({
    example: 'ahmed.badawy',
    description: 'Username or email address',
  })
  @IsString()
  @MinLength(1)
  username!: string

  @ApiProperty({ example: 'Awqaf@2026', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string

  /** @deprecated Kept for transitional clients — ignored when username/password provided. */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  personaId?: string
}

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  currentPassword!: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string
}
