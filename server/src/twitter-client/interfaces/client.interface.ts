// import { Readable } from 'stream';

// import { ZodSchema, z } from 'zod';

/**
 * Represents a UUID string in the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 */
// type UUID = `${string}-${string}-${string}-${string}-${string}`;
/**
 * Represents the content of a message or communication
 */
export interface Content {
  /** The main text content */
  text: string;
  /** Optional action associated with the message */
  action?: string;
  /** Optional source/origin of the content */
  source?: string;
  /** URL of the original message/post (e.g. tweet URL, Discord message link) */
  url?: string;
  /** UUID of parent message if this is a reply/thread */
  inReplyTo?: string;
  /** Array of media attachments */
  //   attachments?: Media[];
  /** Additional dynamic properties */
  [key: string]: unknown;
}

/**
 * Represents a stored memory/message
 */
export interface IMemory {
  /** Optional unique identifier */
  id?: string;
  /** Optional creation timestamp */
  createdAt?: number;
  /** Memory content */
  content: Content;
  /** Optional embedding vector */
  embedding?: number[];
  /** Associated room ID */
  roomId: string;
  /** Whether memory is unique */
  unique?: boolean;
  /** Embedding similarity score */
  similarity?: number;
}

// export interface IMemoryManager {
//   tableName: string;
//   addEmbeddingToMemory(memory: Memory): Promise<Memory>;
//   getMemories(opts: {
//     roomId: UUID;
//     count?: number;
//     unique?: boolean;
//     start?: number;
//     end?: number;
//   }): Promise<Memory[]>;
//   getCachedEmbeddings(content: string): Promise<
//     {
//       embedding: number[];
//       levenshtein_score: number;
//     }[]
//   >;
//   getMemoryById(id: UUID): Promise<Memory | null>;
//   getMemoriesByRoomIds(params: { roomIds: UUID[] }): Promise<Memory[]>;
//   searchMemoriesByEmbedding(
//     embedding: number[],
//     opts: {
//       match_threshold?: number;
//       count?: number;
//       roomId: UUID;
//       unique?: boolean;
//     },
//   ): Promise<Memory[]>;
//   createMemory(memory: Memory, unique?: boolean): Promise<void>;
//   removeMemory(memoryId: UUID): Promise<void>;
//   removeAllMemories(roomId: UUID): Promise<void>;
//   countMemories(roomId: UUID, unique?: boolean): Promise<number>;
// }
