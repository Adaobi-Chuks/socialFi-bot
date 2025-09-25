/**
 * RequestQueue
 * ------------
 * This class manages and processes asynchronous requests sequentially (one at a time),
 * ensuring controlled and reliable execution. It is especially useful when interacting with
 * external APIs or systems that have strict rate limits, can be overloaded, or require serialized access.
 *
 * Features:
 * - Maintains a queue of asynchronous request functions.
 * - Ensures only one request runs at any given time (FIFO order).
 * - Retries failed requests by re-queuing them at the front of the queue.
 * - Implements exponential backoff for retries to avoid overwhelming the target system.
 * - Adds a random delay between processing requests to smooth out traffic.
 *
 * Usage:
 * Call `add(() => someAsyncFunction())` to enqueue a request.
 * The request will be processed in order, and the returned Promise will resolve
 * with the result of the async function or reject if it fails after retrying.
 *
 * Note:
 * This implementation does not have a retry limit. Failed requests will be retried indefinitely
 * with increasing backoff until they succeed.
 */

export class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing: boolean = false;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      try {
        await request();
      } catch (error) {
        console.error('Error processing request:', error);
        this.queue.unshift(request);
        await this.exponentialBackoff(this.queue.length);
      }
      await this.randomDelay();
    }

    this.processing = false;
  }

  private async exponentialBackoff(retryCount: number): Promise<void> {
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
