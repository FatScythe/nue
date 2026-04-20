import { NestFactory } from '@nestjs/core';
import { CoreServiceModule } from './core-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CoreServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
