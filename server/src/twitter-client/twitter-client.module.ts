import { Module } from '@nestjs/common';
import { TwitterClientService } from './twitter-client.service';
import { TwitterClientController } from './twitter-client.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Memory, MemorySchema } from 'src/database/schemas/memory.schema';
import { TwitterClientBase } from './base.provider';
import { TwitterClientInteractions } from './interactions.provider';
import { WalletModule } from 'src/wallet/wallet.module';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { ParseCommandService } from './parse-command';

import {
  Transaction,
  TransactionSchema,
} from 'src/database/schemas/transactions.schema';
import { TwitterClientDirectMessage } from './directMessage.provider';
import {
  DirectMessage,
  DirectMessageSchema,
} from 'src/database/schemas/directMessage.schema';
import { Cookies, CookiesSchema } from 'src/database/schemas/cookie.schema';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { IntentDetectionModule } from 'src/intent-detection/intent-detection.module';
import { ReefCoreModule } from 'src/reef-core/reef-core.module';

@Module({
  imports: [
    JwtModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: Memory.name, schema: MemorySchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: DirectMessage.name, schema: DirectMessageSchema },
      { name: Cookies.name, schema: CookiesSchema },
    ]),
    WalletModule,
    IntentDetectionModule,
    ReefCoreModule,
  ],
  providers: [
    TwitterClientService,
    TwitterClientBase,
    TwitterClientInteractions,
    TwitterClientDirectMessage,
    ParseCommandService,
  ],
  controllers: [TwitterClientController],
})
export class TwitterClientModule {}
