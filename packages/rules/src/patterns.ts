import { z } from 'zod';

/**
 * The 13 specified dark patterns in Annexure 1 of the CCPA Guidelines for Prevention and
 * Regulation of Dark Patterns, 2023, in Annexure order.
 */
export const PATTERN_IDS = [
  'false_urgency',
  'basket_sneaking',
  'confirm_shaming',
  'forced_action',
  'subscription_trap',
  'interface_interference',
  'bait_and_switch',
  'drip_pricing',
  'disguised_advertisement',
  'nagging',
  'trick_question',
  'saas_billing',
  'rogue_malware',
] as const;

export const PatternIdSchema = z.enum(PATTERN_IDS);
export type PatternId = z.infer<typeof PatternIdSchema>;

export interface PatternInfo {
  id: PatternId;
  /** Position in Annexure 1 (1-13). */
  annexureItem: number;
  name: string;
  /** Short code used as the prefix for criterion, signal and check IDs. */
  code: string;
}

export const PATTERNS: readonly PatternInfo[] = [
  { id: 'false_urgency', annexureItem: 1, name: 'False Urgency', code: 'FU' },
  { id: 'basket_sneaking', annexureItem: 2, name: 'Basket Sneaking', code: 'BS' },
  { id: 'confirm_shaming', annexureItem: 3, name: 'Confirm Shaming', code: 'CS' },
  { id: 'forced_action', annexureItem: 4, name: 'Forced Action', code: 'FA' },
  { id: 'subscription_trap', annexureItem: 5, name: 'Subscription Trap', code: 'ST' },
  { id: 'interface_interference', annexureItem: 6, name: 'Interface Interference', code: 'II' },
  { id: 'bait_and_switch', annexureItem: 7, name: 'Bait and Switch', code: 'BW' },
  { id: 'drip_pricing', annexureItem: 8, name: 'Drip Pricing', code: 'DP' },
  { id: 'disguised_advertisement', annexureItem: 9, name: 'Disguised Advertisement', code: 'DA' },
  { id: 'nagging', annexureItem: 10, name: 'Nagging', code: 'NG' },
  { id: 'trick_question', annexureItem: 11, name: 'Trick Question', code: 'TQ' },
  { id: 'saas_billing', annexureItem: 12, name: 'SaaS Billing', code: 'SB' },
  { id: 'rogue_malware', annexureItem: 13, name: 'Rogue Malware', code: 'RM' },
];

const byId = new Map(PATTERNS.map((p) => [p.id, p]));

export function getPatternInfo(id: PatternId): PatternInfo {
  const info = byId.get(id);
  if (!info) throw new Error(`Unknown pattern "${id}"`);
  return info;
}
