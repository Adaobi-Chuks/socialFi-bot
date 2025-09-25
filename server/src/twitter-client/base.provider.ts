import { Inject, Injectable, Logger } from '@nestjs/common';
// import { twitterLogger } from './utils/logger.util';
import { RequestQueue } from './utils/requestQueue.util';
import {
  QueryTweetsResponse,
  Scraper,
  SearchMode,
  Tweet,
} from 'agent-twitter-client';
import { twitterConfig } from './config/twitter.config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory } from 'src/database/schemas/memory.schema';
import { Cookies } from 'src/database/schemas/cookie.schema';
// import { IMemory } from './interfaces/client.interface';

type TwitterProfile = {
  id: string;
  username: string;
  screenName: string;
  bio: string;
};

@Injectable()
export class TwitterClientBase {
  readonly logger = new Logger(TwitterClientBase.name);
  readonly twitterClient: Scraper;
  readonly requestQueue: RequestQueue;
  profile: TwitterProfile;
  lastCheckedTweetId: bigint | null = null;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Memory.name) readonly memoryModel: Model<Memory>,
    @InjectModel(Cookies.name) readonly cookiesModel: Model<Cookies>,
  ) {
    this.twitterClient = new Scraper();
    this.requestQueue = new RequestQueue();
  }
  // "agent-twitter-client": "^0.0.17",
  async init() {
    //test
    const username = twitterConfig.TWITTER_USERNAME;

    if (!username) {
      throw new Error('Twitter username not configured');
    }
    // Check for Twitter cookies
    if (twitterConfig.TWITTER_COOKIES) {
      const cookiesArray = JSON.parse(twitterConfig.TWITTER_COOKIES);
      // console.log('this is cookiesArray :', cookiesArray);
      await this.setCookiesFromArray(cookiesArray);
    } else {
      const cachedCookies = await this.getCachedCookies(process.env.TWITTER_ID);
      // console.log('this is cached cookie :', cachedCookies);
      if (cachedCookies) {
        await this.setCookiesFromArray(cachedCookies.cookies);
      }
    }

    this.logger.log('Waiting for Twitter login...');
    await this.twitterClient.login(
      username,
      twitterConfig.TWITTER_PASSWORD,
      twitterConfig.TWITTER_EMAIL,
      twitterConfig.TWITTER_2FA_SECRET || undefined,
    );

    if (await this.twitterClient.isLoggedIn()) {
      const cookies = await this.twitterClient.getCookies();
      await this.cacheCookies(process.env.TWITTER_ID, cookies);
      this.logger.log('Successfully logged in to Twitter.');
    }
    // while (true) {
    //   try {
    //     await this.twitterClient.login(
    //       username,
    //       twitterConfig.TWITTER_PASSWORD,
    //       twitterConfig.TWITTER_EMAIL,
    //       twitterConfig.TWITTER_2FA_SECRET || undefined,
    //     );

    //     if (await this.twitterClient.isLoggedIn()) {
    //       const cookies = await this.twitterClient.getCookies();
    //       await this.cacheCookies(process.env.TWITTER_ID, cookies);
    //       this.logger.log('Successfully logged in to Twitter.');
    //       break;
    //     }

    //     this.logger.warn('Not logged in yet. Retrying...');
    //   } catch (error) {
    //     this.logger.error(`Login error: ${error.message}`);
    //   }

    //   await new Promise((resolve) => setTimeout(resolve, 2000));
    // }

    // Initialize Twitter profile
    this.profile = await this.fetchProfile(username);

    if (this.profile) {
      this.logger.log('Twitter user ID:', this.profile.id);
      this.logger.log(
        'Twitter loaded:',
        JSON.stringify(this.profile, null, 10),
      );
    } else {
      throw new Error('Failed to load profile');
    }

    await this.loadLatestCheckedTweetId();
    await this.populateTimeline();
  }

  async setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
          cookie.secure ? 'Secure' : ''
        }; ${cookie.httpOnly ? 'HttpOnly' : ''}; SameSite=${
          cookie.sameSite || 'Lax'
        }`,
    );
    await this.twitterClient.setCookies(cookieStrings);
  }
  async fetchProfile(username: string): Promise<TwitterProfile> {
    const cached = await this.getCachedProfile(username);

    if (cached) return cached;

    try {
      const profile = await this.requestQueue.add(async () => {
        const profile = await this.twitterClient.getProfile(username);
        console.log({ profile });
        return {
          id: profile.userId,
          username,
          screenName: profile.name,
          bio: profile.biography || '',
        } satisfies TwitterProfile;
      });

      this.cacheProfile(profile);

      return profile;
    } catch (error) {
      console.error('Error fetching Twitter profile:', error);

      return undefined;
    }
  }

  async cacheTweet(tweet: Tweet): Promise<void> {
    if (!tweet) {
      this.logger.log('Tweet is undefined, skipping cache');
      return;
    }

    this.cacheManager.set(`twitter/tweets/${tweet.id}`, tweet);
  }

  async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
    const cached = await this.cacheManager.get<Tweet>(
      `twitter/tweets/${tweetId}`,
    );

    return cached;
  }

  async getTweet(tweetId: string): Promise<Tweet> {
    const cachedTweet = await this.getCachedTweet(tweetId);

    if (cachedTweet) {
      return cachedTweet;
    }

    const tweet = await this.requestQueue.add(() =>
      this.twitterClient.getTweet(tweetId),
    );

    await this.cacheTweet(tweet);
    return tweet;
  }

  async loadLatestCheckedTweetId(): Promise<void> {
    const latestCheckedTweetId = await this.cacheManager.get<string>(
      `twitter/${this.profile.username}/latest_checked_tweet_id`,
    );

    if (latestCheckedTweetId) {
      this.lastCheckedTweetId = BigInt(latestCheckedTweetId);
    }
  }

  async cacheLatestCheckedTweetId() {
    if (this.lastCheckedTweetId) {
      await this.cacheManager.set(
        `twitter/${this.profile.username}/latest_checked_tweet_id`,
        this.lastCheckedTweetId.toString(),
      );
    }
  }

  async getCachedTimeline(): Promise<Tweet[] | undefined> {
    return await this.cacheManager.get<Tweet[]>(
      `twitter/${this.profile.username}/timeline`,
    );
  }

  async cacheTimeline(timeline: Tweet[]) {
    await this.cacheManager.set(
      `twitter/${this.profile.username}/timeline`,
      timeline,
      10 * 1000,
    );
  }

  async cacheMentions(mentions: Tweet[]) {
    await this.cacheManager.set(
      `twitter/${this.profile.username}/mentions`,
      mentions,
      10 * 1000,
    );
  }

  async getCachedCookies(userId: string) {
    return await this.cookiesModel.findOne({ userId });
  }

  async cacheCookies(userId: string, cookies: any[]) {
    await this.cookiesModel.findOneAndUpdate(
      { userId },
      { cookies },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async getCachedProfile(username: string) {
    return await this.cacheManager.get<TwitterProfile>(
      `twitter/${username}/profile`,
    );
  }

  async cacheProfile(profile: TwitterProfile) {
    await this.cacheManager.set(`twitter/${profile.username}/profile`, profile);
  }

  async fetchHomeTimeline(count: number): Promise<Tweet[]> {
    this.logger.debug('fetching home timeline');
    const homeTimeline = await this.twitterClient.getUserTweets(
      this.profile.id,
      count,
    );

    return homeTimeline.tweets;
  }

  async fetchSearchTweets(
    query: string,
    maxTweets: number,
    searchMode: SearchMode,
    cursor?: string,
  ): Promise<QueryTweetsResponse> {
    try {
      // Sometimes this fails because we are rate limited. in this case, we just need to return an empty array
      // if we dont get a response in 5 seconds, something is wrong
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ tweets: [] }), 10000),
      );

      try {
        const result = await this.requestQueue.add(
          async () =>
            await Promise.race([
              this.twitterClient.fetchSearchTweets(
                query,
                maxTweets,
                searchMode,
                cursor,
              ),
              timeoutPromise,
            ]),
        );
        return (result ?? { tweets: [] }) as QueryTweetsResponse;
      } catch (error) {
        this.logger.error('Error fetching search tweets:', error);
        return { tweets: [] };
      }
    } catch (error) {
      this.logger.error('Error fetching search tweets:', error);
      return { tweets: [] };
    }
  }

  private async populateTimeline(): Promise<void> {
    this.logger.debug('Populating timeline...');

    const cachedTweets = await this.getCachedTimeline();
    console.log('cachedTweets', cachedTweets);

    let tweetsToProcess: Tweet[] = [];

    if (cachedTweets && cachedTweets.length) {
      const existingMemories = await this.memoryModel
        .find({
          roomId: {
            $in: cachedTweets.map((tweet) =>
              this.getRoomId(tweet.conversationId),
            ),
          },
        })
        .exec();

      const existingMemoryIds = new Set(
        existingMemories.map((memory) => memory.id),
      );

      tweetsToProcess = cachedTweets.filter(
        (tweet) => !existingMemoryIds.has(this.getTweetId(tweet.id)),
      );

      if (tweetsToProcess.length === 0) {
        this.logger.log('No new tweets to store from cache.');
        return;
      }
    } else {
      // If no cache, fetch from Twitter
      const timelineTweets = await this.fetchHomeTimeline(50);

      // Get the most recent 20 mentions and interactions
      const mentionsAndInteractions = await this.fetchSearchTweets(
        `@${twitterConfig.TWITTER_USERNAME}`,
        20,
        SearchMode.Latest,
      );

      // Combine the timeline tweets and mentions/interactions
      const allTweets = [...timelineTweets, ...mentionsAndInteractions.tweets];

      const existingMemories = await this.memoryModel
        .find({
          roomId: {
            $in: allTweets.map((tweet) => this.getRoomId(tweet.conversationId)),
          },
        })
        .exec();

      const existingMemoryIds = new Set(
        existingMemories.map((memory) => memory.id),
      );

      tweetsToProcess = allTweets.filter(
        (tweet) => !existingMemoryIds.has(this.getTweetId(tweet.id)),
      );

      // Cache the fetched tweets
      await this.cacheTimeline(timelineTweets);
      await this.cacheMentions(mentionsAndInteractions.tweets);
    }

    this.logger.debug(
      `Saving ${tweetsToProcess.length} new tweets as memories...`,
    );

    for (const tweet of tweetsToProcess) {
      const memory = new this.memoryModel({
        id: this.getTweetId(tweet.id),
        roomId: this.getRoomId(tweet.conversationId),
        content: tweet.text,
        embedding: this.getZeroEmbedding(),
        createdAt: new Date(tweet.timestamp * 1000),
      });

      await memory.save();
      await this.cacheTweet(tweet);
    }

    this.logger.log(`Finished saving ${tweetsToProcess.length} tweets.`);
  }

  getTweetId(tweetId: string): string {
    return `${tweetId}`;
  }

  getRoomId(conversationId: string): string {
    return `${conversationId}`;
  }

  getZeroEmbedding(): number[] {
    return new Array(1536).fill(0); // or whatever your embedding size is
  }

  async saveRequestMessage(message) {
    if (message.content.text) {
      const recentMessage = await this.memoryModel
        .find({ roomId: message.roomId })
        .sort({ createdAt: -1 }) // Most recent first
        .exec();

      if (
        recentMessage.length > 0 &&
        recentMessage[0].content === message.content.text
      ) {
        this.logger.debug('Message already saved', recentMessage[0].id);
      } else {
        await new this.memoryModel({
          id: message.id,
          roomId: message.roomId,
          content: message.text,
          createdAt: message.createdAt,
          embedding: this.getZeroEmbedding(),
        }).save();
      }
      return;
    }
    return;
  }

  private createConversationId(userIdA: string, userIdB: string): string {
    // Sort lexicographically to ensure consistent ordering
    const [id1, id2] = [userIdA, userIdB].sort();
    return `${id1}-${id2}`;
  }

  async sendDirectMessage(userId: string, message: string) {
    try {
      const conversationId = this.createConversationId(
        process.env.TWITTER_ID,
        userId,
      );
      await this.twitterClient.sendDirectMessage(conversationId, message);
    } catch (error) {
      console.log(error);
      return;
    }
  }
}
