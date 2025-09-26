import { Module } from '@nestjs/common';
import { ReefCoreService } from './reef-core.service';
import { ReefCoreController } from './reef-core.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transaction,
  TransactionSchema,
} from 'src/database/schemas/transactions.schema';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  providers: [ReefCoreService],
  controllers: [ReefCoreController],
  exports: [ReefCoreService],
})
export class ReefCoreModule {}
