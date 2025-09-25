import { Inject, Injectable, Logger } from '@nestjs/common';
// import { twitterLogger } from './utils/logger.util';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory } from 'src/database/schemas/memory.schema';
import { TwitterClientBase } from './base.provider';
import { twitterConfig } from './config/twitter.config';
import { SearchMode, Tweet } from 'agent-twitter-client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Content, IMemory } from './interfaces/client.interface';
import { ParseCommandService } from './parse-command';
import { HttpService } from '@nestjs/axios';
import * as dotenv from 'dotenv';
dotenv.config();
const MAX_TWEET_LENGTH = 280;

// interface TweetData {
//   text: string;
//   media?: string; // URL to image (e.g., token logo)
// }

@Injectable()
export class TwitterClientInteractions {
  private readonly logger = new Logger(TwitterClientInteractions.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly twitterClientBase: TwitterClientBase,
    private readonly parseBotCommandService: ParseCommandService,
    @InjectModel(Memory.name) private readonly memoryModel: Model<Memory>,
  ) {}

  // async start() {
  //   const handleTwitterInteractionsLoop = () => {
  //     this.handleTwitterInteractions();
  //     setTimeout(
  //       handleTwitterInteractionsLoop,
  //       Number(twitterConfig.TWITTER_POLL_INTERVAL || 30) * 1000, // Default to 2 minutes
  //     );
  //   };
  //   handleTwitterInteractionsLoop();
  // }

  async start() {
    const pollInterval =
      Number(twitterConfig.TWITTER_POLL_INTERVAL || 30) * 1000;

    let isRunning = false;

    const handleTwitterInteractionsLoop = async () => {
      if (isRunning) {
        console.log('Previous loop still running, skipping this cycle');
        return;
      }

      isRunning = true;
      try {
        await this.handleTwitterInteractions();
      } catch (err) {
        console.error('Error in handleTwitterInteractions:', err);
      } finally {
        isRunning = false;
      }
    };

    // Run on a fixed interval
    setInterval(handleTwitterInteractionsLoop, pollInterval);
  }

  async handleTwitterInteractions() {
    this.logger.log('Checking Twitter interactions');

    const twitterUsername = twitterConfig.TWITTER_USERNAME;
    try {
      // Check for mentions
      const tweetCandidates = (
        await this.twitterClientBase.fetchSearchTweets(
          `@${twitterUsername}`,
          20, //number of tweets to pull
          SearchMode.Latest,
        )
      ).tweets;

      // de-duplicate tweetCandidates with a set
      const uniqueTweetCandidates = [...new Set(tweetCandidates)];

      // Sort tweet candidates by ID in ascending order
      uniqueTweetCandidates
        .sort((a, b) => a.id.localeCompare(b.id))
        .filter((tweet) => tweet.userId !== twitterConfig.TWITTER_USERNAME);
      // console.log('tweets \n :', uniqueTweetCandidates);

      // for each tweet candidate, handle the tweet
      for (const tweet of uniqueTweetCandidates) {
        if (
          !this.twitterClientBase.lastCheckedTweetId ||
          BigInt(tweet.id) > this.twitterClientBase.lastCheckedTweetId
        ) {
          // Generate the tweetId UUID the same way it's done in handleTweet
          const tweetId = this.getTweetId(tweet.id);
          // Check if we've already processed this tweet
          const existingResponse = await this.memoryModel
            .findOne({
              id: tweetId,
            })
            .exec();

          if (existingResponse) {
            this.logger.log(`Already responded to tweet ${tweet.id}, skipping`);
            continue;
          }
          this.logger.log('New Tweet found', tweet.permanentUrl);

          const roomId = this.getRoomId(tweet.conversationId);

          // if (tweet.userId === process.env.TWITTER_ID) {
          //   this.logger.log('skipping tweet from bot itself', tweet.id);
          //   // Skip processing if the tweet is from the bot itself
          //   return;
          // }

          const thread = await this.buildConversationThread(
            tweet,
            this.twitterClientBase,
          );
          // this.logger.log(tweet);
          this.logger.log(`this is the user tweet  :, ${tweet.text}`);

          const message = {
            content: { text: tweet.text },
            roomId,
          };

          await this.handleTweet({
            tweet,
            message,
            thread,
          });

          // Update the last checked tweet ID after processing each tweet
          this.twitterClientBase.lastCheckedTweetId = BigInt(tweet.id);
        }
      }

      // Save the latest checked tweet ID to the file
      await this.twitterClientBase.cacheLatestCheckedTweetId();

      this.logger.log('Finished checking Twitter interactions');
    } catch (error) {
      this.logger.error('Error handling Twitter interactions:', error);
    }
  }

  private async handleTweet({
    tweet,
    message,
    thread,
  }: {
    tweet: Tweet;
    message: IMemory;
    thread: Tweet[];
  }) {
    if (
      tweet.userId === process.env.TWITTER_ID ||
      tweet.userId === process.env.TEAM_TWITTER_ID
    ) {
      this.logger.log(
        'skipping tweet from bot itself or the teams own',
        tweet.id,
      );
      // Skip processing if the tweet is from the bot itself
      return;
    }

    if (!message.content.text) {
      this.logger.log(`Skipping Tweet with no text, ${tweet.id}`);
      return { text: '', action: 'IGNORE' };
    }

    this.logger.log(`Processing Tweet: , ${tweet.id}`);
    //   const formatTweet = (tweet: Tweet) => {
    //     return `  ID: ${tweet.id}
    // From: ${tweet.name} (@${tweet.username})
    // Text: ${tweet.text}`;
    //   };
    // const currentPost = formatTweet(tweet);

    this.logger.debug(`Thread: , ${thread}`);
    const formattedConversation = thread
      .map(
        (tweet) => `@${tweet.username} (${new Date(
          tweet.timestamp * 1000,
        ).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        })}):
        ${tweet.text}`,
      )
      .join('\n\n');

    this.logger.debug(`formattedConversation: , ${formattedConversation}`);

    // check if the tweet exists, save if it doesn't
    const tweetId = this.getTweetId(tweet.id);
    const tweetExists = await this.memoryModel
      .findOne({
        id: tweetId,
      })
      .exec();

    if (!tweetExists) {
      this.logger.log('tweet does not exist, saving');
      const roomId = this.getRoomId(tweet.conversationId);

      const message = {
        id: tweetId,
        content: tweet.text,
        roomId,
        createdAt: tweet.timestamp * 1000,
      };
      await this.twitterClientBase.saveRequestMessage(message);
    }

    // const defiResponse = await this.parseBotCommandService.handleTweetCommand(
    //   tweet.text,
    //   tweet.userId,
    // );

    const defiResponse = await this.httpService.axiosRef
      .post(`${process.env.DEFI_PROCESSOR_API}`, {
        userId: tweet.userId,
        prompt: tweet.text,
      })
      .then((res) => res.data)
      .catch((err) => {
        this.logger.error('Error processing tweet command:', err);
        return "I'm sorry, I couldn't process your request at this time.";
      });
    if (!defiResponse) {
      return;
    }

    console.log('this is response :', defiResponse);

    const response: Content = {
      text: defiResponse,
      url: tweet.permanentUrl,
      inReplyTo: tweet.inReplyToStatusId
        ? this.getTweetId(tweet.inReplyToStatusId)
        : undefined,
    };

    const stringId = this.getTweetId(tweet.id);

    response.inReplyTo = stringId;
    response.action = 'REPLY';

    if (response.text) {
      try {
        const callback: any = async (response: Content) => {
          const memories = await this.sendTweet(
            this.twitterClientBase,
            response,
            message.roomId,
            twitterConfig.TWITTER_USERNAME,
            tweet.id,
          );
          return memories;
        };

        const responseMessages = await callback(response);

        for (const responseMessage of responseMessages) {
          if (
            responseMessage === responseMessages[responseMessages.length - 1]
          ) {
            responseMessage.content.action = response.action;
          } else {
            responseMessage.content.action = 'CONTINUE';
          }
          await new this.memoryModel({
            id: responseMessage.id,
            roomId: responseMessage.roomId,
            content: responseMessage.text,
            createdAt: responseMessage.createdAt,
            embedding: this.getZeroEmbedding(),
          }).save();
        }

        const responseInfo = `Selected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;

        await this.cacheManager.set(
          `twitter/tweet_generation_${tweet.id}.txt`,
          responseInfo,
        );
        await this.wait();
      } catch (error) {
        console.log(error);
        this.logger.error(`Error sending response tweet: ${error}`);
      }
    }
  }

  //TODO:MxReplies
  buildConversationThread = async (
    tweet: Tweet,
    client: TwitterClientBase,
    maxReplies: number = 20,
  ): Promise<Tweet[]> => {
    const thread: Tweet[] = [];
    const visited: Set<string> = new Set();

    const processThread = async (currentTweet: Tweet, depth: number = 0) => {
      this.logger.debug('Processing tweet:', {
        id: currentTweet.id,
        inReplyToStatusId: currentTweet.inReplyToStatusId,
        depth: depth,
      });

      if (!currentTweet) {
        this.logger.debug('No current tweet found for thread building');
        return;
      }

      // Stop if we've reached our reply limit
      if (depth >= maxReplies) {
        this.logger.debug('Reached maximum reply depth', depth);
        return;
      }

      // Handle memory storage
      const memory = await this.memoryModel
        .find({
          id: client.getTweetId(currentTweet.id),
        })
        .exec();

      if (!memory) {
        const memory = new this.memoryModel({
          id: client.getTweetId(currentTweet.id),
          content: currentTweet.text,
          createdAt: currentTweet.timestamp * 1000,
          roomId: client.getRoomId(currentTweet.conversationId),
        });
        await memory.save();
        this.logger.debug('Saved memory for tweet:', currentTweet.id);
      }

      if (visited.has(currentTweet.id)) {
        this.logger.debug('Already visited tweet:', currentTweet.id);
        return;
      }

      visited.add(currentTweet.id);
      thread.unshift(currentTweet);

      this.logger.debug('Current thread state:', {
        length: thread.length,
        currentDepth: depth,
        tweetId: currentTweet.id,
      });

      // If there's a parent tweet, fetch and process it
      if (currentTweet.inReplyToStatusId) {
        this.logger.debug(
          'Fetching parent tweet:',
          currentTweet.inReplyToStatusId,
        );
        try {
          const parentTweet = await client.twitterClient.getTweet(
            currentTweet.inReplyToStatusId,
          );

          if (parentTweet) {
            this.logger.debug('Found parent tweet:', {
              id: parentTweet.id,
              text: parentTweet.text?.slice(0, 50),
            });
            await processThread(parentTweet, depth + 1);
          } else {
            this.logger.debug(
              'No parent tweet found for:',
              currentTweet.inReplyToStatusId,
            );
          }
        } catch (error) {
          this.logger.error('Error fetching parent tweet:', {
            tweetId: currentTweet.inReplyToStatusId,
            error,
          });
        }
      } else {
        this.logger.debug('Reached end of reply chain at:', currentTweet.id);
      }
    };

    await processThread(tweet, 0);

    this.logger.debug('Final thread built:', {
      totalTweets: thread.length,
      tweetIds: thread.map((t) => ({
        id: t.id,
        text: t.text?.slice(0, 50),
      })),
    });

    return thread;
  };

  private getTweetId(tweetId: string): string {
    return `${tweetId}`;
  }

  private getRoomId(conversationId: string): string {
    return `${conversationId}`;
  }

  private getZeroEmbedding(): number[] {
    return new Array(1536).fill(0); // or whatever your embedding size is
  }

  wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
      Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
  };

  async sendTweet(
    client: TwitterClientBase,
    content: Content,
    roomId: string,
    twitterUsername: string,
    inReplyTo: string,
  ): Promise<IMemory[]> {
    const tweetChunks = this.splitTweetContent(content.text);
    const sentTweets: Tweet[] = [];
    let previousTweetId = inReplyTo;

    for (const chunk of tweetChunks) {
      const result = await client.requestQueue.add(
        async () =>
          await client.twitterClient.sendTweet(chunk.trim(), previousTweetId),
      );
      const body = await result.json();

      // if we have a response
      if (body?.data?.create_tweet?.tweet_results?.result) {
        // Parse the response
        const tweetResult = body.data.create_tweet.tweet_results.result;
        const finalTweet: Tweet = {
          id: tweetResult.rest_id,
          text: tweetResult.legacy.full_text,
          conversationId: tweetResult.legacy.conversation_id_str,
          timestamp: new Date(tweetResult.legacy.created_at).getTime() / 1000,
          userId: tweetResult.legacy.user_id_str,
          inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
          permanentUrl: `https://twitter.com/${twitterUsername}/status/${tweetResult.rest_id}`,
          hashtags: [],
          mentions: [],
          photos: [],
          thread: [],
          urls: [],
          videos: [],
        };
        sentTweets.push(finalTweet);
        previousTweetId = finalTweet.id;
      } else {
        console.error('Error sending chunk', chunk, 'repsonse:', body);
      }

      // Wait a bit between tweets to avoid rate limiting issues
      await this.wait(1000, 2000);
    }

    const memories: IMemory[] = sentTweets.map((tweet) => ({
      id: this.getTweetId(tweet.id),
      content: {
        text: tweet.text,
        source: 'twitter',
        url: tweet.permanentUrl,
        inReplyTo: tweet.inReplyToStatusId
          ? this.getTweetId(tweet.inReplyToStatusId)
          : undefined,
      },
      roomId,
      embedding: this.getZeroEmbedding(),
      createdAt: tweet.timestamp * 1000,
    }));

    return memories;
  }

  splitTweetContent(content: string): string[] {
    const maxLength = MAX_TWEET_LENGTH;
    const paragraphs = content.split('\n\n').map((p) => p.trim());
    const tweets: string[] = [];
    let currentTweet = '';

    for (const paragraph of paragraphs) {
      if (!paragraph) continue;

      if ((currentTweet + '\n\n' + paragraph).trim().length <= maxLength) {
        if (currentTweet) {
          currentTweet += '\n\n' + paragraph;
        } else {
          currentTweet = paragraph;
        }
      } else {
        if (currentTweet) {
          tweets.push(currentTweet.trim());
        }
        if (paragraph.length <= maxLength) {
          currentTweet = paragraph;
        } else {
          // Split long paragraph into smaller chunks
          const chunks = this.splitParagraph(paragraph, maxLength);
          tweets.push(...chunks.slice(0, -1));
          currentTweet = chunks[chunks.length - 1];
        }
      }
    }

    if (currentTweet) {
      tweets.push(currentTweet.trim());
    }

    return tweets;
  }

  splitParagraph(paragraph: string, maxLength: number): string[] {
    // eslint-disable-next-line
    const sentences = paragraph.match(/[^\.!\?]+[\.!\?]+|[^\.!\?]+$/g) || [
      paragraph,
    ];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).trim().length <= maxLength) {
        if (currentChunk) {
          currentChunk += ' ' + sentence;
        } else {
          currentChunk = sentence;
        }
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        if (sentence.length <= maxLength) {
          currentChunk = sentence;
        } else {
          // Split long sentence into smaller pieces
          const words = sentence.split(' ');
          currentChunk = '';
          for (const word of words) {
            if ((currentChunk + ' ' + word).trim().length <= maxLength) {
              if (currentChunk) {
                currentChunk += ' ' + word;
              } else {
                currentChunk = word;
              }
            } else {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
              }
              currentChunk = word;
            }
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
