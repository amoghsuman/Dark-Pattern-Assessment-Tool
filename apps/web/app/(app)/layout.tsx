import { connection } from 'next/server';
import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { RepositoryProvider } from '@/lib/data/repository-provider';
import { getServerEnv } from '@/lib/env';

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Read DATA_SOURCE per request rather than baking it in at build time.
  await connection();
  const { dataSource } = getServerEnv();

  return (
    <RepositoryProvider dataSource={dataSource}>
      <div className="flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main id="main" className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </RepositoryProvider>
  );
}
