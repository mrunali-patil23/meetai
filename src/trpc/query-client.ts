import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';
/**
 * Create a preconfigured TanStack QueryClient for this app.
 *
 * The client sets sensible defaults:
 * - queries.staleTime: 30 seconds
 * - dehydrate.shouldDehydrateQuery: preserves default behavior and also dehydrates queries whose state is `'pending'`
 *
 * @returns A new configured `QueryClient` instance.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        // serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        // deserializeData: superjson.deserialize,
      },
    },
  });
}