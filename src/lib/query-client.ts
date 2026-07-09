import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Configure persistence for static data
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'RESERVAS_CACHE',
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  hydrateOptions: {},
  dehydrateOptions: {
    // Only persist queries that match these keys
    shouldDehydrateQuery: (query) => {
      const queryKey = query.queryKey as string[];
      // DO NOT persist reservations or resources
      if (queryKey.includes('reservations') || queryKey.includes('resources')) {
        return false;
      }
      // Persist organizations
      return (
        queryKey.includes('organizations') ||
        queryKey.includes('organization')
      );
    },
  },
});
