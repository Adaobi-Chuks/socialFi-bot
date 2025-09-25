import { Module } from '@nestjs/common';
import { ReefCoreService } from './reef-core.service';
import { ReefCoreController } from './reef-core.controller';

@Module({
  providers: [ReefCoreService],
  controllers: [ReefCoreController]
})
export class ReefCoreModule {}
