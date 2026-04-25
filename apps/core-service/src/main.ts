import { HttpAdapterHost, NestFactory } from '@nestjs/core';
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

  Logger.warn(`🚀 Core Service is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
