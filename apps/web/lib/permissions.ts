'use client';

import type { Role } from '@dpat/shared';

import { useCurrentUser } from '@/lib/data/hooks';

/** UI-level permission checks. Repositories enforce the same rules; these only shape the UI. */
export const can = {
  createAssessment: (role: Role) => role === 'admin' || role === 'assessor',
  manageSettings: (role: Role) => role === 'admin',
  exportReports: (role: Role) => role !== 'viewer',
};

/** The acting user's role, or null while it loads. */
export function useRole(): Role | null {
  return useCurrentUser().data?.role ?? null;
}
