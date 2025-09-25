import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
