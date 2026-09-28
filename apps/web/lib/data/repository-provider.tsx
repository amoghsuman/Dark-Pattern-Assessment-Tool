'use client';

import {
  createRepositories,
  type DataSource,
  type Repositories,
  type SampleControls,
} from '@dpat/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface DataContextValue {
  repositories: Repositories;
  sampleControls: SampleControls | null;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * Supplies the repositories for the configured data source, plus a query cache.
 * This is the only place a data source is chosen; screens use the hooks in ./hooks.
 */
export function RepositoryProvider({
  dataSource,
  children,
}: {
  dataSource: DataSource;
  children: ReactNode;
}) {
  const [value] = useState<DataContextValue>(() => createRepositories(dataSource));
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <DataContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DataContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useRepositories must be used inside <RepositoryProvider>');
  return ctx.repositories;
}

/** Sample-mode controls (role switcher, reset); null for other data sources. */
export function useSampleControls(): SampleControls | null {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useSampleControls must be used inside <RepositoryProvider>');
  return ctx.sampleControls;
}
