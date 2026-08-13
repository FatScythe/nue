import 'tsconfig-paths/register';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { CoreServiceModule } from './core-service.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  Logger,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './filters';
import { TransformInterceptor } from './interceptors';
import { configuration } from './config';
import { DEFAULT_API_KEY } from '@database';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(CoreServiceModule);
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.enableCors();

  app.use(helmet());

  // trusted ip for reverse proxy
  // reverse proxy will always come from 127.0.0.1
  app.set('trust proxy', '127.0.0.1');

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  const config = new DocumentBuilder()
    .setTitle('Core Banking Application API')
    .setDescription(
      'Production-ready CBA API supporting dual Auth: Bearer JWTs and Secret Keys.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token generated from /auth/access-token',
        in: 'header',
      },
      'bearer-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'nue-sec-key',
        in: 'header',
        'x-tokenName': 'nue-sec-key',
        description: `Enter secret key starting with nsk_ ... e,g ${DEFAULT_API_KEY}`,
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  // validate dtos...
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // @Transform decorator applied from dto
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        return validationErrors; // handling in exception filter
      },
    }),
  );

  // express v5 query parser - use extended to support nested objects/arrays
  app.set('query parser', 'extended');

  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.useGlobalInterceptors(new TransformInterceptor());

  const port = configuration().port;

  await app.listen(port);

  Logger.warn(`🚀 Core Service docs on: http://localhost:${port}/api/v1/docs`);
  Logger.warn(`🚀 Core Service is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
