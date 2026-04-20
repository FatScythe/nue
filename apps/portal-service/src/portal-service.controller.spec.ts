import { Test, TestingModule } from '@nestjs/testing';
import { PortalServiceController } from './portal-service.controller';
import { PortalServiceService } from './portal-service.service';

describe('PortalServiceController', () => {
  let portalServiceController: PortalServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PortalServiceController],
      providers: [PortalServiceService],
    }).compile();

    portalServiceController = app.get<PortalServiceController>(PortalServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(portalServiceController.getHello()).toBe('Hello World!');
    });
  });
});
