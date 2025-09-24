import { Test, TestingModule } from '@nestjs/testing';
import { TwitterClientService } from './twitter-client.service';

describe('TwitterClientService', () => {
  let service: TwitterClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwitterClientService],
    }).compile();

    service = module.get<TwitterClientService>(TwitterClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
