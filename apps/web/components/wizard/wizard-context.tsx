'use client';

import type { JourneyStage } from '@dpat/shared';
import { createContext, useContext } from 'react';

import type { StepErrors, WizardDraft } from '@/lib/wizard/draft';

export interface WizardContextValue {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft> | ((draft: WizardDraft) => WizardDraft)) => void;
  /** Errors for the current step; empty until the user tries to continue. */
  errors: StepErrors;
  stages: JourneyStage[];
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used inside the assessment wizard');
  return ctx;
}
