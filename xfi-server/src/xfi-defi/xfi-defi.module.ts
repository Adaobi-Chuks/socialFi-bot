import { Module } from '@nestjs/common';
import { WalletModule } from 'src/wallet/wallet.module';
import { HttpModule } from '@nestjs/axios';
import {
  Transaction,
  TransactionSchema,
} from 'src/database/schemas/transactions.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { XfiDefiEthereumService } from './xfi-defi-ethereum.service';
import { XfiDefiSeiService } from './xfi-defi-sei.service';

@Module({
  imports: [
    WalletModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  exports: [XfiDefiEthereumService, XfiDefiSeiService],
  providers: [XfiDefiEthereumService, XfiDefiSeiService],
})
export class XfiDexModule {}
