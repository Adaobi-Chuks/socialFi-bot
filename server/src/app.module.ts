import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { TwitterClientModule } from './twitter-client/twitter-client.module';
import { CacheModule } from '@nestjs/cache-manager';
import { DatabaseModule } from './database/database.module';
import { WalletModule } from './wallet/wallet.module';
import { IntentDetectionModule } from './intent-detection/intent-detection.module';
import { ReefCoreModule } from './reef-core/reef-core.module';
import { TwitterClientModule } from './twitter-client/twitter-client.module';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    WalletModule,
    DatabaseModule,
    TwitterClientModule,
    IntentDetectionModule,
    ReefCoreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
