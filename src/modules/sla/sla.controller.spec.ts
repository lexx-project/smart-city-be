import { Test, TestingModule } from '@nestjs/testing';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';

describe('SlaController', () => {
  let controller: SlaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlaController],
      providers: [SlaService],
    }).compile();

    controller = module.get<SlaController>(SlaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
