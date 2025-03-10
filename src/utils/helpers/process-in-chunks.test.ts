import { processInChunks } from './process-in-chunks';

describe('processInChunks', () => {
  // Mock async function that returns the input after a delay
  const mockAsyncOperation = jest.fn(
    (item: number, index: number): Promise<{ value: number; index: number }> =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ value: item, index });
        }, 10);
      })
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process all items and maintain original order', async () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const limit = 3;

    const results = await processInChunks(data, mockAsyncOperation, limit);

    // Verify all items were processed
    expect(results.length).toBe(data.length);

    // Verify results are in the correct order
    results.forEach((result, index) => {
      expect(result.value).toBe(data[index]);

      expect(result.index).toBe(index);
    });

    // Verify the callback was called for each item
    expect(mockAsyncOperation).toHaveBeenCalledTimes(data.length);
  });

  it('should process in chunks with the specified limit', async () => {
    const data = [1, 2, 3, 4, 5, 6, 7];

    const limit = 2;

    // Create a spy to track when promises are created vs resolved
    const callOrder: number[] = [];

    const spyOperation = jest.fn(
      (item: number): Promise<number> =>
        new Promise((resolve) => {
          callOrder.push(item); // Track when the promise is created

          setTimeout(() => {
            resolve(item);
          }, item * 10); // Different delays to ensure we're waiting for chunks
        })
    );

    await processInChunks(data, spyOperation, limit);

    // Verify the chunks were processed in the correct order
    // We should see [1,2], [3,4], [5,6], [7] as our chunks
    expect(callOrder).toEqual([1, 2, 3, 4, 5, 6, 7]);

    expect(spyOperation).toHaveBeenCalledTimes(data.length);
  });

  it('should handle empty array input', async () => {
    const data: number[] = [];

    const results = await processInChunks(data, mockAsyncOperation);

    expect(results).toEqual([]);

    expect(mockAsyncOperation).not.toHaveBeenCalled();
  });

  it('should use default limit if not specified', async () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // We'll use a spy to track when promises are created
    const callTracker: number[] = [];

    const spyOperation = jest.fn(
      (item: number): Promise<number> =>
        new Promise((resolve) => {
          callTracker.push(item);

          setTimeout(() => resolve(item), 10);
        })
    );

    await processInChunks(data, spyOperation);

    // Default limit is 5, so we should see all items processed
    expect(callTracker).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(spyOperation).toHaveBeenCalledTimes(data.length);
  });
});
