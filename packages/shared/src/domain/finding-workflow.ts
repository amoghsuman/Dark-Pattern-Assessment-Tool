import type { FindingStatus, Role } from '../schemas/common';

/**
 * Finding review workflow.
 *
 *   detected ──► under_review ──► confirmed ──► remediation_in_progress ──► closed
 *      │              │               │                 │                     │
 *      └──────────────┴──► dismissed ◄┘                 └──► confirmed        │
 *                              │                          (fix rejected)      │
 *                              └──► under_review (reopen) ◄───────────────────┘
 */
export const STATUS_TRANSITIONS: Readonly<Record<FindingStatus, readonly FindingStatus[]>> = {
  detected: ['under_review', 'dismissed'],
  under_review: ['confirmed', 'dismissed'],
  confirmed: ['remediation_in_progress', 'under_review', 'dismissed'],
  remediation_in_progress: ['closed', 'confirmed'],
  dismissed: ['under_review'],
  closed: ['under_review'],
};

/** Transitions an assessor may make. Reviewers and admins may make any valid transition. */
const ASSESSOR_TRANSITIONS: ReadonlySet<string> = new Set([
  'detected>under_review',
  'confirmed>remediation_in_progress',
]);

export function isValidTransition(from: FindingStatus, to: FindingStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function canTransition(role: Role, from: FindingStatus, to: FindingStatus): boolean {
  if (!isValidTransition(from, to)) return false;
  switch (role) {
    case 'admin':
    case 'reviewer':
      return true;
    case 'assessor':
      return ASSESSOR_TRANSITIONS.has(`${from}>${to}`);
    case 'viewer':
      return false;
  }
}

/** Statuses the given role can move a finding to from `from`. */
export function allowedTransitions(role: Role, from: FindingStatus): FindingStatus[] {
  return STATUS_TRANSITIONS[from].filter((to) => canTransition(role, from, to));
}

export function canComment(role: Role): boolean {
  return role !== 'viewer';
}

/** Explains why a transition is refused, for bulk-update reporting. */
export function transitionRefusal(
  role: Role,
  from: FindingStatus,
  to: FindingStatus,
): string | null {
  if (from === to) return 'Already in that status';
  if (!isValidTransition(from, to)) return `Cannot move from ${from} to ${to}`;
  if (!canTransition(role, from, to)) return `The ${role} role cannot make this change`;
  return null;
}

/** Statuses that still need attention (count towards open risk). */
export const OPEN_STATUSES: readonly FindingStatus[] = [
  'detected',
  'under_review',
  'confirmed',
  'remediation_in_progress',
];
