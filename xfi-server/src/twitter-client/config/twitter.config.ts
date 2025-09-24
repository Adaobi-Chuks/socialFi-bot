import { z } from 'zod';
import { twitterLogger } from '../utils/logger.util';
import * as dotenv from 'dotenv';

dotenv.config();

export const twitterEnvSchema = z.object({
  TWITTER_DRY_RUN: z.string().transform((val) => val.toLowerCase() === 'true'),
  TWITTER_USERNAME: z.string().min(1, 'Twitter username is required'),
  TWITTER_PASSWORD: z.string().min(1, 'Twitter password is required'),
  TWITTER_EMAIL: z.string().email('Valid Twitter email is required'),
  TWITTER_COOKIES: z.string().optional(),
  TWITTER_2FA_SECRET: z.string().optional(),
  TWITTER_POLL_INTERVAL: z.number().optional(),
  TWITTER_DM_POLL_INTERVAL: z.number().optional(),
});

export type TwitterConfig = z.infer<typeof twitterEnvSchema>;

export async function validateTwitterConfig(): Promise<TwitterConfig> {
  try {
    const config = {
      TWITTER_DRY_RUN: process.env.TWITTER_DRY_RUN || 'false',
      TWITTER_USERNAME: process.env.TWITTER_USERNAME,
      TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
      TWITTER_EMAIL: process.env.TWITTER_EMAIL,
      TWITTER_COOKIES: process.env.TWITTER_COOKIES,
      TWITTER_2FA_SECRET: process.env.TWITTER_2FA_SECRET,
      TWITTER_POLL_INTERVAL: process.env.TWITTER_POLL_INTERVAL,
      TWITTER_DM_POLL_INTERVAL: process.env.TWITTER_DM_POLL_INTERVAL,
    };

    return twitterEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      twitterLogger.error(
        `Twitter configuration validation failed:\n${errorMessages}`,
      );
      throw new Error(
        `Twitter configuration validation failed:\n${errorMessages}`,
      );
    }
    throw error;
  }
}

function loadTwitterConfig(): TwitterConfig {
  try {
    const config = {
      TWITTER_DRY_RUN: process.env.TWITTER_DRY_RUN || 'false',
      TWITTER_USERNAME: process.env.TWITTER_USERNAME,
      TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
      TWITTER_EMAIL: process.env.TWITTER_EMAIL,
      TWITTER_COOKIES: process.env.TWITTER_COOKIES,
      TWITTER_2FA_SECRET: process.env.TWITTER_2FA_SECRET,
    };

    return twitterEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      twitterLogger.error(
        `Twitter configuration validation failed:\n${errorMessages}`,
      );
      throw new Error(
        `Twitter configuration validation failed:\n${errorMessages}`,
      );
    }
    throw error;
  }
}

export const twitterConfig = loadTwitterConfig(); // ✅ validated + exported
