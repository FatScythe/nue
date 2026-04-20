import { NestFactory } from '@nestjs/core';
import { PortalServiceModule } from './portal-service.module';

async function bootstrap() {
  const app = await NestFactory.create(PortalServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
