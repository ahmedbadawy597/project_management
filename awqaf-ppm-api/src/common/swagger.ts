import { applyDecorators } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger'

export const ApiErrorMessage = {
  message: { type: 'string', example: 'Unauthorized' },
}

export function ApiSecured(summary: string, extras?: { forbidden?: boolean }) {
  const decorators = [
    ApiBearerAuth('JWT'),
    ApiOperation({ summary }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid Bearer token',
      schema: { properties: ApiErrorMessage },
    }),
  ]
  if (extras?.forbidden) {
    decorators.push(
      ApiForbiddenResponse({
        description: 'Missing required capability',
        schema: { properties: ApiErrorMessage },
      }),
    )
  }
  return applyDecorators(...decorators)
}

export function ApiPublic(summary: string) {
  return applyDecorators(ApiOperation({ summary }))
}

export { ApiTags, ApiResponse, ApiBearerAuth }
