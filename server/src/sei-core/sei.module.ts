import { Module } from '@nestjs/common';
import { WalletModule } from 'src/wallet/wallet.module';
import { HttpModule } from '@nestjs/axios';
import {
  Transaction,
  TransactionSchema,
} from 'src/database/schemas/transactions.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { XfiDefiSeiService } from './sei.service';

@Module({
  imports: [
    WalletModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  exports: [XfiDefiSeiService],
  providers: [XfiDefiSeiService],
})
export class XfiDexModule {}
