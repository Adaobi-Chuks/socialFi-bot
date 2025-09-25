import { Test, TestingModule } from '@nestjs/testing';
import { TwitterClientController } from './twitter-client.controller';

describe('TwitterClientController', () => {
  let controller: TwitterClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwitterClientController],
    }).compile();

    controller = module.get<TwitterClientController>(TwitterClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
