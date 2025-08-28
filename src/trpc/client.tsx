'use client';
// ^-- to make sure we can mount the Provider from a server component
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { makeQueryClient } from './query-client';
import type { AppRouter } from './routers/_app';
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
let browserQueryClient: QueryClient;
/**
 * Return a React Query `QueryClient` appropriate for the current environment.
 *
 * On the server (when `window` is undefined) this always creates and returns a new
 * `QueryClient` to avoid cross-request state sharing. In the browser this returns
 * a singleton `QueryClient` stored in the module-level `browserQueryClient`, creating
 * it on first access to ensure the client is not recreated across renders (important
 * when React suspends during initial render).
 *
 * @returns A `QueryClient` instance for use with React Query.
 */
function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
/**
 * Resolve the base URL for the tRPC HTTP endpoint.
 *
 * On the client (browser) this returns a relative path to the API (`/api/trpc`).
 * On the server it prefixes the path with the NEXT_PUBLIC_APP_URL environment
 * variable so the endpoint is an absolute URL (`<NEXT_PUBLIC_APP_URL>/api/trpc`).
 *
 * @returns The full URL string to the tRPC HTTP endpoint.
 */
function getUrl() {
  const base = (() => {
    if (typeof window !== 'undefined') return '';
    return process.env.NEXT_PUBLIC_APP_URL;
  })();
  return `${base}/api/trpc`;
}
/**
 * Wraps the app in React Query and tRPC providers.
 *
 * Obtains a server-aware QueryClient and lazily creates a stable tRPC client, then
 * renders a QueryClientProvider containing a TRPCProvider so downstream components
 * can use React Query and the `useTRPC` hook with the application's AppRouter.
 *
 * @param props.children - React nodes to render inside the provider tree.
 * @returns A JSX element containing the composed providers with the given children.
 */
export function TRPCReactProvider(
  props: Readonly<{
    children: React.ReactNode;
  }>,
) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          // transformer: superjson, <-- if you use a data transformer
          url: getUrl(),
        }),
      ],
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}