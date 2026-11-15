import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { MessageExceptionFilter } from './common/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  )
  app.useGlobalFilters(new MessageExceptionFilter())
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') || 'http://localhost:5173',
    credentials: true,
  })

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Awqaf PPM API')
    .setDescription(
      'Ministry of Awqaf – Project Portfolio Management API. ' +
        'Authenticate with `POST /api/auth/login` using a demo persona, then send `Authorization: Bearer <token>`.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /api/auth/login',
      },
      'JWT',
    )
    .addTag('Health')
    .addTag('Auth')
    .addTag('Bootstrap')
    .addTag('Demo')
    .addTag('Projects')
    .addTag('Apps')
    .addTag('People')
    .addTag('WBS')
    .addTag('Milestones')
    .addTag('Risks')
    .addTag('SLAs')
    .addTag('Transactions')
    .addTag('Approvals')
    .addTag('Documents')
    .addTag('Activities')
    .addTag('Notifications')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Awqaf PPM API Docs',
  })

  const port = Number(config.get<string>('PORT') || 3001)
  await app.listen(port)
  console.log(`Awqaf PPM API listening on http://localhost:${port}/api`)
  console.log(`Swagger docs at http://localhost:${port}/api/docs`)
}

void bootstrap()
