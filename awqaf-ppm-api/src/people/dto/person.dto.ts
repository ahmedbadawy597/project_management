import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

const APP_ROLES = [
  'Portfolio Director',
  'Project Manager',
  'Developer',
  'Business',
  'PMO Analyst',
  'Executive Viewer',
] as const

export class CreatePersonDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAr?: string

  @ApiProperty()
  @IsEmail()
  email!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string

  @ApiPropertyOptional({ description: 'Job title / display role' })
  @IsOptional()
  @IsString()
  role?: string

  @ApiPropertyOptional({ enum: APP_ROLES })
  @IsOptional()
  @IsIn(APP_ROLES)
  appRole?: (typeof APP_ROLES)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  allocation?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  availability?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({ type: [String], description: 'Projects to assign this user to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[]
}

export class UpdatePersonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAr?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string

  @ApiPropertyOptional({ enum: APP_ROLES })
  @IsOptional()
  @IsIn(APP_ROLES)
  appRole?: (typeof APP_ROLES)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  allocation?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  availability?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({ type: [String], description: 'Replace project assignments' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[]
}
