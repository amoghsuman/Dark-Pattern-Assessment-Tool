import { describe, expect, it } from 'vitest';

import { FindingStatusSchema } from '../schemas/common';
import {
  allowedTransitions,
  canComment,
  canTransition,
  isValidTransition,
  STATUS_TRANSITIONS,
  transitionRefusal,
} from './finding-workflow';

describe('finding workflow', () => {
  it('defines transitions for every status and never to itself', () => {
    for (const status of FindingStatusSchema.options) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined();
      expect(STATUS_TRANSITIONS[status]).not.toContain(status);
    }
  });

  it('follows the review path', () => {
    expect(isValidTransition('detected', 'under_review')).toBe(true);
    expect(isValidTransition('under_review', 'confirmed')).toBe(true);
    expect(isValidTransition('confirmed', 'remediation_in_progress')).toBe(true);
    expect(isValidTransition('remediation_in_progress', 'closed')).toBe(true);
  });

  it('does not allow skipping review', () => {
    expect(isValidTransition('detected', 'confirmed')).toBe(false);
    expect(isValidTransition('detected', 'closed')).toBe(false);
    expect(isValidTransition('under_review', 'closed')).toBe(false);
  });

  it('allows reopening dismissed and closed findings', () => {
    expect(isValidTransition('dismissed', 'under_review')).toBe(true);
    expect(isValidTransition('closed', 'under_review')).toBe(true);
  });

  it('lets reviewers and admins make any valid transition', () => {
    expect(canTransition('reviewer', 'under_review', 'confirmed')).toBe(true);
    expect(canTransition('admin', 'remediation_in_progress', 'closed')).toBe(true);
    expect(canTransition('reviewer', 'detected', 'confirmed')).toBe(false);
  });

  it('limits assessors to triage and starting remediation', () => {
    expect(allowedTransitions('assessor', 'detected')).toEqual(['under_review']);
    expect(allowedTransitions('assessor', 'confirmed')).toEqual(['remediation_in_progress']);
    expect(canTransition('assessor', 'under_review', 'confirmed')).toBe(false);
    expect(canTransition('assessor', 'detected', 'dismissed')).toBe(false);
  });

  it('keeps viewers read-only', () => {
    for (const status of FindingStatusSchema.options) {
      expect(allowedTransitions('viewer', status)).toEqual([]);
    }
    expect(canComment('viewer')).toBe(false);
    expect(canComment('assessor')).toBe(true);
  });

  it('explains refusals', () => {
    expect(transitionRefusal('reviewer', 'closed', 'closed')).toBe('Already in that status');
    expect(transitionRefusal('reviewer', 'detected', 'closed')).toMatch(/Cannot move/);
    expect(transitionRefusal('viewer', 'detected', 'under_review')).toMatch(/viewer role/);
    expect(transitionRefusal('reviewer', 'detected', 'under_review')).toBeNull();
  });
});
