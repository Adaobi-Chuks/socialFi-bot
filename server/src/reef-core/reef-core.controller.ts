import { Controller, Post, Query } from '@nestjs/common';
import { ReefCoreService } from './reef-core.service';

@Controller('reef-core')
export class ReefCoreController {
  constructor(private readonly reefCoreService: ReefCoreService) {}

  /**
   * Simple test endpoint to check balance
   * Example: GET /reef/test?pk=0xYOUR_PRIVATE_KEY
   */
  @Post('test')
  async test(@Query('pk') pk: string) {
    if (!pk) {
      return { error: 'Missing pk query param' };
    }

    try {
      const balance = await this.reefCoreService.getBalance(
        '0xD81e692C35b480Be9E237Ac9E13828656619C8B6',
      );
      const send = await this.reefCoreService.send(
        pk,
        '0xD81e692C35b480Be9E237Ac9E13828656619C8B6',
        '2',
      );
      const estimateFee = await this.reefCoreService.estimateFee(
        pk,
        '0xD81e692C35b480Be9E237Ac9E13828656619C8B6',
        '2',
      );
      return {
        balance,
        send,
        estimateFee,
      };
    } catch (err: any) {
      return { error: err.message };
    }
  }
}
