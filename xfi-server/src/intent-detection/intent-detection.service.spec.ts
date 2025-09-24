import { Test, TestingModule } from '@nestjs/testing';
import { IntentDetectionService } from './intent-detection.service';

describe('IntentDetectionService', () => {
  let service: IntentDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntentDetectionService],
    }).compile();

    service = module.get<IntentDetectionService>(IntentDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
