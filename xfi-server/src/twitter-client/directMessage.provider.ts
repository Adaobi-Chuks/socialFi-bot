import { Inject, Injectable, Logger } from '@nestjs/common';
// import { twitterLogger } from './utils/logger.util';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory } from 'src/database/schemas/memory.schema';
import { TwitterClientBase } from './base.provider';
import { twitterConfig } from './config/twitter.config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ParseCommandService } from './parse-command';
import { DirectMessage } from 'src/database/schemas/directMessage.schema';

interface IDirectMessage {
  id: string;
  text: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  mediaUrls?: string[];
  senderScreenName?: string;
  recipientScreenName?: string;
}

@Injectable()
export class TwitterClientDirectMessage {
  private readonly logger = new Logger(TwitterClientDirectMessage.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly twitterClientBase: TwitterClientBase,
    private readonly parseBotCommandService: ParseCommandService,
    @InjectModel(Memory.name) private readonly memoryModel: Model<Memory>,
    @InjectModel(DirectMessage.name)
    private readonly directMessageModel: Model<DirectMessage>,
  ) {}

  async start() {
    const handleDirectMessageLoop = () => {
      this.handleDirectMessages();
      setTimeout(
        handleDirectMessageLoop,
        Number(twitterConfig.TWITTER_POLL_INTERVAL || 30) * 1000, // Default to 2 minutes
      );
    };
    handleDirectMessageLoop();
  }
  async handleDirectMessages() {
    this.logger.log('Checking Direct Message interactions');

    // const twitterUsername = twitterConfig.TWITTER_USERNAME;
    try {
      // check direct dm
      const dm =
        await this.twitterClientBase.twitterClient.getDirectMessageConversations(
          this.twitterClientBase.profile.id,
        );

      //   console.log('dm   :');
      //   console.dir(dm.conversations, { depth: null, colors: true });

      const now = Date.now(); // Current timestamp in milliseconds
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      const filteredConversations = dm.conversations
        .map((convo) => {
          const recentMessages = convo.messages.filter((message) => {
            const createdAt = Number(message.createdAt); // Convert string to number
            return (
              createdAt >= fiveMinutesAgo &&
              message.recipientId === this.twitterClientBase.profile.id
            );
          });

          return {
            ...convo,
            messages: recentMessages,
          };
        })
        .filter((convo) => convo.messages.length > 0); // Remove empty conversations

      for (const conversation of filteredConversations) {
        try {
          const existingConversations = await this.directMessageModel.findOne({
            messageId:
              conversation.messages[conversation.messages.length - 1].id,
          });
          if (existingConversations) {
            this.logger.log(
              `Already responded to conversation ${conversation.messages[conversation.messages.length - 1].id}, skipping`,
            );
            continue;
          }

          await this.saveConversation(
            conversation.messages[conversation.messages.length - 1],
          );

          // conversation.messages[conversation.messages.length - 1] .. because we only need the latest message in any conversation
          await this.handleConversation(
            conversation.messages[conversation.messages.length - 1],
          );
        } catch (error) {
          console.log(error);
        }
      }

      console.dir(filteredConversations, { depth: null, colors: true });

      this.logger.log('Finished checking direct Messages');
    } catch (error) {
      this.logger.error('Error handling Twitter Direct Messages:', error);
    }
  }

  private async handleConversation(conversation: IDirectMessage) {
    try {
      const defiResponse = await this.parseBotCommandService.handleTweetCommand(
        conversation.text,
        conversation.senderId,
        conversation.senderScreenName,
        'twitter-dm',
      );

      if (!defiResponse) {
        return;
      }
      console.log('this is response :', defiResponse);
      return await this.twitterClientBase.sendDirectMessage(
        conversation.senderId,
        defiResponse,
      );
    } catch (error) {
      console.log(error);
    }
  }

  private async saveConversation(conversation: IDirectMessage) {
    try {
      const newMessage = new this.directMessageModel({
        messageId: conversation.id,
        userId: conversation.senderId,
        content: conversation.text,
        senderId: conversation.senderId,
        recipientId: conversation.recipientId,
        createdAt: conversation.createdAt,
        senderScreenName: conversation.senderScreenName,
        recipientScreenName: conversation.recipientScreenName,
      });

      await newMessage.save();
    } catch (error) {
      console.log(error);
    }
  }
}
