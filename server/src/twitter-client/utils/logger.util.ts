import { Logger } from '@nestjs/common';

// Singleton logger instance with context 'TwitterClients'
const twitterLogger = new Logger('TwitterClients', { timestamp: true });

export { twitterLogger };
// Usage example
// twitterLogger.log('This is a log message');
// twitterLogger.error('This is an error message');
// twitterLogger.warn('This is a warning message');
// twitterLogger.debug('This is a debug message');
// twitterLogger.verbose('This is a verbose message');
// twitterLogger.setContext('CustomContext');
// twitterLogger.setTimestamp(true);
