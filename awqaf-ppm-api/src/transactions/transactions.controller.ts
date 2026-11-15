import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequireCapabilities } from '../common/capabilities.decorator'
import { CapabilitiesGuard } from '../common/capabilities.guard'
import { ApiSecured } from '../common/swagger'
import { BudgetTransactionDto } from '../common/swagger-dtos'
import { TransactionsService } from './transactions.service'

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiSecured('List budget transactions')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [BudgetTransactionDto] })
  list(@Query('projectId') projectId?: string) {
    return this.transactions.list(projectId)
  }

  @Post()
  @RequireCapabilities('budget:adjust')
  @ApiSecured('Add budget transaction', { forbidden: true })
  @ApiBody({ type: BudgetTransactionDto })
  @ApiCreatedResponse({ type: BudgetTransactionDto })
  add(@Body() body: Record<string, unknown>) {
    return this.transactions.add(body)
  }
}
