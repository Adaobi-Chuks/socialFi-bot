import { Injectable, Logger } from '@nestjs/common';

import { TwitterClientBase } from './base.provider';
import { TwitterClientInteractions } from './interactions.provider';
import { TwitterClientDirectMessage } from './directMessage.provider';

@Injectable()
export class TwitterClientService {
  private readonly logger = new Logger(TwitterClientService.name);

  constructor(
    private readonly twitterClientBase: TwitterClientBase,
    private readonly twitterClientInteractions: TwitterClientInteractions,
    private readonly twitterClientDirectMessage: TwitterClientDirectMessage,
  ) {
    this.twitterClientBase
      .init()
      .then(() => {
        this.logger.log('Twitter client initialized');
      })
      .catch((error) => {
        this.logger.error('Error initializing Twitter client:', error);
      });
    this.twitterClientInteractions.start();
    this.twitterClientDirectMessage.start();
  }
}
