import { BookOpen, ClipboardList, Settings, type LucideIcon } from 'lucide-react';
import type { Route } from 'next';

export interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Returns true when the item should show as active for `pathname`. */
  matches: (pathname: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Assessments',
    icon: ClipboardList,
    matches: (p) => p === '/' || p.startsWith('/assessments'),
  },
  // Route cast until the Rule library page lands (M8).
  {
    href: '/rules' as Route,
    label: 'Rule library',
    icon: BookOpen,
    matches: (p) => p.startsWith('/rules'),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    matches: (p) => p.startsWith('/settings'),
  },
];
