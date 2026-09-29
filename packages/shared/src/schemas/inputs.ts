import { z } from 'zod';

import { DateSchema, IdSchema, TimestampSchema } from './common';

/**
 * Assessment inputs that are collected before a run: test credentials, reusable test data,
 * OTP handling, repository connections, configuration types and the client access checklist.
 * Secrets never live in these records: credentials hold an opaque vault reference.
 */

// ---------------------------------------------------------------- credentials

export const CredentialRefSchema = z.object({
  id: IdSchema,
  label: z.string().trim().min(1),
  username: z.string().trim().min(1),
  /** Opaque reference into the secret vault (Stage C). Sample mode stores nothing. */
  secretRef: z.string().min(1),
  /** e.g. "••••41" so assessors can tell credentials apart without seeing them. */
  maskedHint: z.string().min(1),
  storage: z.enum(['vault', 'not_stored']),
  storedAt: TimestampSchema,
});
export type CredentialRef = z.infer<typeof CredentialRefSchema>;

// ---------------------------------------------------------------- test data sets

/** Luhn check, used for sandbox card numbers. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const CustomerTestDataSchema = z.object({
  fullName: z.string().trim().min(2),
  dateOfBirth: DateSchema,
  gender: z.enum(['female', 'male', 'other']),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'A 10-digit Indian mobile number'),
  email: z.email(),
  pan: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'PAN format: ABCDE1234F'),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'A 6-digit PIN code'),
  city: z.string().trim().min(2),
});
export type CustomerTestData = z.infer<typeof CustomerTestDataSchema>;

export const PaymentSandboxDataSchema = z.object({
  gateway: z.string().trim().min(2),
  cardNumber: z.string().refine(passesLuhn, 'Use a sandbox card number that passes the Luhn check'),
  cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'MM/YY'),
  upiId: z.string().regex(/^[\w.-]{2,}@[a-zA-Z]{2,}$/, 'A UPI ID such as success@razorpay'),
  netbankingBank: z.string().trim().min(2),
});
export type PaymentSandboxData = z.infer<typeof PaymentSandboxDataSchema>;

const TestDataSetBase = {
  id: IdSchema,
  organizationId: IdSchema,
  name: z.string().trim().min(2),
  description: z.string().optional(),
  createdAt: TimestampSchema,
};

export const TestDataSetSchema = z.discriminatedUnion('kind', [
  z.object({ ...TestDataSetBase, kind: z.literal('customer'), fields: CustomerTestDataSchema }),
  z.object({
    ...TestDataSetBase,
    kind: z.literal('payment_sandbox'),
    fields: PaymentSandboxDataSchema,
  }),
]);
export type TestDataSet = z.infer<typeof TestDataSetSchema>;

// ---------------------------------------------------------------- OTP handling

export const OtpHandlingSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('not_required') }),
  z.object({
    mode: z.literal('fixed_test_otp'),
    otpLength: z.number().int().min(4).max(8),
    secretRef: z.string().min(1),
    maskedHint: z.string().min(1),
  }),
  z.object({
    mode: z.literal('live_assessor_entry'),
    assessorUserId: IdSchema,
    timeoutSeconds: z.number().int().min(30).max(900),
    instructions: z.string().optional(),
  }),
]);
export type OtpHandling = z.infer<typeof OtpHandlingSchema>;

// ---------------------------------------------------------------- source and configuration

export const RepositoryProviderSchema = z.enum(['github', 'gitlab', 'bitbucket']);
export type RepositoryProvider = z.infer<typeof RepositoryProviderSchema>;

export const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;

export const CodeSourceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('repository'),
    provider: RepositoryProviderSchema,
    repoUrl: z.url(),
    branch: z.string().trim().min(1),
    /** Full 40-character SHA pinned for audit traceability. */
    commitSha: z.string().regex(FULL_COMMIT_SHA, 'A full 40-character commit SHA'),
    access: z.literal('read_only'),
    tokenRef: CredentialRefSchema.optional(),
  }),
  z.object({ kind: z.literal('archive'), artifactId: IdSchema }),
]);
export type CodeSource = z.infer<typeof CodeSourceSchema>;

export const ConfigTypeSchema = z.enum([
  'notification_schedule',
  'pricing_rules',
  'cms_export',
  'feature_flags',
  'communication_template',
]);
export type ConfigType = z.infer<typeof ConfigTypeSchema>;

// ---------------------------------------------------------------- client access checklist

export const ClientAccessItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['website', 'android', 'ios', 'source', 'backend_config', 'general']),
  label: z.string().min(1),
  status: z.enum(['provided', 'outstanding', 'not_required']),
  detail: z.string().optional(),
});
export type ClientAccessItem = z.infer<typeof ClientAccessItemSchema>;
