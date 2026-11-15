import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateProjectDto {
  @ApiProperty({ example: 'AWQ-APP-100' })
  @IsString()
  @MinLength(1)
  code!: string

  @ApiProperty({ example: 'New Digital Initiative' })
  @IsString()
  @MinLength(1)
  name!: string

  @ApiProperty({ example: 'مبادرة رقمية جديدة' })
  @IsString()
  @MinLength(1)
  nameAr!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string

  @ApiProperty({ example: 'p-pm1' })
  @IsString()
  @MinLength(1)
  managerId!: string

  @ApiPropertyOptional({ example: 'Planned' })
  @IsOptional()
  @IsString()
  status?: string

  @ApiProperty({ example: '2026-01-01' })
  @IsString()
  plannedStart!: string

  @ApiProperty({ example: '2026-12-31' })
  @IsString()
  plannedEnd!: string

  @ApiPropertyOptional({ example: 'Initiation' })
  @IsOptional()
  @IsString()
  phase?: string

  @ApiPropertyOptional({ example: 1000000 })
  @IsOptional()
  @IsNumber()
  budgetApproved?: number

  @ApiPropertyOptional({ example: 'Low' })
  @IsOptional()
  @IsString()
  riskLevel?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  charter?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  charterAr?: string
}
