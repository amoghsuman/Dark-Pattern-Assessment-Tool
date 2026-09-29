'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/common/page-states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { OrganisationSettings } from './organisation-settings';
import { StageSettings } from './stage-settings';
import { TestDataSettings } from './test-data-settings';
import { UserSettings } from './user-settings';

const TABS = ['organisation', 'users', 'stages', 'test-data'] as const;
type Tab = (typeof TABS)[number];

export function SettingsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get('tab');
  const tab: Tab = TABS.find((t) => t === requested) ?? 'organisation';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Settings"
        description="Organisation details, users and roles, journey stages (the compliance matrix columns) and reusable test data."
      />
      <Tabs
        value={tab}
        onValueChange={(next) =>
          router.replace(`${pathname}?tab=${next}` as Route, { scroll: false })
        }
      >
        <TabsList>
          <TabsTrigger value="organisation">Organisation</TabsTrigger>
          <TabsTrigger value="users">Users and roles</TabsTrigger>
          <TabsTrigger value="stages">Journey stages</TabsTrigger>
          <TabsTrigger value="test-data">Test data</TabsTrigger>
        </TabsList>
        <TabsContent value="organisation" className="mt-4">
          <OrganisationSettings />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserSettings />
        </TabsContent>
        <TabsContent value="stages" className="mt-4">
          <StageSettings />
        </TabsContent>
        <TabsContent value="test-data" className="mt-4">
          <TestDataSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
