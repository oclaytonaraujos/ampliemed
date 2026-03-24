/**
 * Pagination utilities with cursor-based approach
 * More efficient than offset/limit for large datasets
 */

import type { PaginatedResult } from '../types';

/**
 * Cursor-based pagination query builder for Supabase
 * @param query The Supabase query to paginate
 * @param cursor Optional cursor for the next page
 * @param limit Number of items per page
 * @returns Paginated result with next cursor
 *
 * @example
 * const { items, nextCursor, hasMore } = await cursorPaginate(
 *   supabase.from('patients').select('*'),
 *   null,
 *   50
 * );
 */
export async function cursorPaginate<T extends { id: string; createdAt?: string }>(
  query: any,
  cursor: string | null,
  limit: number = 50
): Promise<PaginatedResult<T>> {
  let paginatedQuery = query.order('created_at', { ascending: false }).limit(limit + 1);

  // If cursor provided, fetch items after this cursor
  if (cursor) {
    // Decode cursor (base64 encoded id:timestamp)
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    paginatedQuery = paginatedQuery.gt('created_at', decoded);
  }

  const { data, error } = await paginatedQuery;

  if (error) {
    throw new Error(`Pagination error: ${error.message}`);
  }

  const items = data.slice(0, limit) as T[];
  const hasMore = data.length > limit;

  // Create cursor for next page (encode last item's timestamp)
  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    const cursorData = lastItem?.createdAt || new Date().toISOString();
    nextCursor = Buffer.from(cursorData).toString('base64');
  }

  return {
    items,
    nextCursor,
    hasMore,
    total: items.length,
  };
}

/**
 * Infinite scroll hook for paginated data
 * @param fetchFn Function to fetch data with cursor
 * @param options Configuration options
 *
 * @example
 * const { items, fetchMore, hasMore, loading } = useInfiniteScroll(
 *   (cursor) => fetchPatients(cursor)
 * );
 */
export function createInfiniteScrollHandler<T>(
  fetchFn: (cursor: string | null) => Promise<PaginatedResult<T>>,
  options = { initialLimit: 50 }
) {
  let items: T[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let loading = false;

  return {
    async fetchMore() {
      if (loading || !hasMore) return;

      loading = true;
      try {
        const result = await fetchFn(cursor);
        items = cursor ? [...items, ...result.items] : result.items;
        cursor = result.nextCursor;
        hasMore = result.hasMore;
        return result;
      } finally {
        loading = false;
      }
    },

    reset() {
      items = [];
      cursor = null;
      hasMore = true;
      loading = false;
    },

    getItems() {
      return [...items];
    },

    getState() {
      return { items, cursor, hasMore, loading };
    },
  };
}

/**
 * Generator function for pagination
 * @param fetchFn Fetch function accepting cursor
 * @param limit Items per page
 *
 * @example
 * for await (const page of paginationGenerator(fetchPatients)) {
 *   console.log(page.items);
 * }
 */
export async function* paginationGenerator<T>(
  fetchFn: (cursor: string | null) => Promise<PaginatedResult<T>>,
  limit: number = 50
) {
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const result = await fetchFn(cursor);
    yield result;

    cursor = result.nextCursor;
    hasMore = result.hasMore && result.items.length > 0;
  }
}

/**
 * Offset-based pagination (legacy support)
 * @deprecated Use cursorPaginate instead for better performance
 */
export async function offsetPaginate<T>(
  query: any,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResult<T> & { total: number; pages: number }> {
  const offset = (page - 1) * limit;

  const { data, error, count } = await query
    .range(offset, offset + limit - 1)
    .select('*', { count: 'exact' });

  if (error) {
    throw new Error(`Pagination error: ${error.message}`);
  }

  const total = count || 0;
  const pages = Math.ceil(total / limit);
  const hasMore = page < pages;

  return {
    items: data as T[],
    nextCursor: hasMore ? String(page + 1) : null,
    hasMore,
    total,
    pages,
  };
}
