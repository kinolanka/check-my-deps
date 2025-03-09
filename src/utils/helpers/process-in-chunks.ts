/**
 * Type for the callback function used in processInChunks
 */
type ProcessCallback<T, R> = (item: T, index: number) => Promise<R>;

/**
 * Processes an array of data in chunks, executing async operations in parallel
 * with a specified concurrency limit.
 *
 * @param data - Array of items to process
 * @param callback - Async function to execute for each item, receives the item and its index
 * @param limit - Maximum number of concurrent operations (default: 5)
 * @returns Promise resolving to an array of results in the same order as input data
 *
 * @example
 * // Process API requests with a concurrency limit of 3
 * const packageNames = ['react', 'lodash', 'axios', 'express', 'typescript'];
 * const results = await processInChunks(
 *   packageNames,
 *   async (name, index) => await fetchPackageInfo(name),
 *   3
 * );
 */
export async function processInChunks<T, R>(
  data: T[],
  callback: ProcessCallback<T, R>,
  limit = 5
): Promise<R[]> {
  // Return empty array if no data
  if (!data.length) {
    return [];
  }

  // Initialize results array with the same length as data
  const results = new Array<R>(data.length);

  // Process data in chunks
  for (let i = 0; i < data.length; i += limit) {
    const chunk = data.slice(i, i + limit);
    const chunkPromises = chunk.map((item, chunkIndex) => {
      const dataIndex = i + chunkIndex;
      return callback(item, dataIndex).then((result) => {
        // Store result at the original index position
        results[dataIndex] = result;
        return result;
      });
    });

    // Wait for all promises in the current chunk to resolve
    await Promise.all(chunkPromises);
  }

  return results;
}
