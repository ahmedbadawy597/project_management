import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'

@Catch()
export class MessageExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void }
    }>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else if (typeof body === 'object' && body) {
        const obj = body as Record<string, unknown>
        // Preserve structured validation payloads (e.g. project-pack import issues)
        if ('ok' in obj || 'issues' in obj || 'summary' in obj) {
          response.status(status).json(obj)
          return
        }
        if ('message' in obj) {
          const raw = obj.message
          message = Array.isArray(raw) ? raw.join(', ') : String(raw)
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    response.status(status).json({ message })
  }
}
