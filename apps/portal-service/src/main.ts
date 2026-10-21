import {
  Logger,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
// import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { Environment } from '@libs/common';

import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';
import { configuration } from './config';
import { PortalServiceModule } from './portal-service.module';

async function bootstrap() {
  const config = configuration();

  const app = await NestFactory.create<NestExpressApplication>(
    PortalServiceModule,
    {
      logger:
        config.nodeEnv === Environment.Development
          ? ['debug']
          : ['error', 'warn', 'log'],
    },
  );

  const httpAdapter = app.get(HttpAdapterHost);
  const port = config.port;

  const allowlist =
    config.nodeEnv === Environment.Production
      ? [config.frontendDomain]
      : [
          'http://localhost:5173',
          `http://localhost:${port}`,
          config.frontendDomain,
        ];

  // cors option
  const corsOptions: any = {
    credentials: true,
    origin: (origin, callback) => {
      // `!origin` allows server-to-server requests (ie, localhost requests)
      if (!origin || allowlist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS: ' + origin));
      }
    },
    optionsSuccessStatus: 200,
  };

  app.enableCors(corsOptions);

  app.use(helmet());

  // trusted ip for reverse proxy e.g nginx
  // reverse proxy will always come from 127.0.0.1
  app.set('trust proxy', '127.0.0.1');

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  // validate dtos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        return validationErrors; // handling in exception filter
      },
    }),
  );

  app.use(urlencoded({ extended: true }));

  app.use(json());

  app.use(cookieParser(config.cookieSecret));

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.listen(port);

  Logger.warn(`🚀 LAAS is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
