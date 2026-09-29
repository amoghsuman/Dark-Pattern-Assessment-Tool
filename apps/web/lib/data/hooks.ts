'use client';

import type {
  AnalysisRun,
  FindingFilter,
  FindingStatus,
  JourneyStage,
  NewAssessmentInput,
  OrganizationSettingsInput,
  PatternId,
  Role,
  StoreSecretInput,
  TestDataSetInput,
  UserInput,
} from '@dpat/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useRepositories, useSampleControls } from './repository-provider';

/** Query keys, grouped so mutations can invalidate precisely. */
export const queryKeys = {
  organization: ['organization'] as const,
  users: ['users'] as const,
  currentUser: ['current-user'] as const,
  assessments: ['assessments'] as const,
  assessment: (id: string) => ['assessments', id] as const,
  artifacts: (assessmentId: string) => ['assessments', assessmentId, 'artifacts'] as const,
  artifact: (id: string) => ['artifacts', id] as const,
  latestRun: (assessmentId: string) => ['assessments', assessmentId, 'run'] as const,
  findings: (assessmentId: string, filter?: FindingFilter) =>
    ['findings', assessmentId, filter ?? {}] as const,
  finding: (id: string) => ['finding', id] as const,
  review: (findingId: string) => ['review', findingId] as const,
  rulePacks: ['rule-packs'] as const,
  rulePack: (patternId: PatternId) => ['rule-packs', patternId] as const,
  rulePackSetVersion: ['rule-pack-set-version'] as const,
};

// ------------------------------------------------------------------ organisation

export function useOrganization() {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.organization,
    queryFn: () => repos.organizations.getCurrent(),
  });
}

export function useUsers() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.users, queryFn: () => repos.organizations.listUsers() });
}

export function useCurrentUser() {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => repos.organizations.getCurrentUser(),
  });
}

export function useUpdateOrganization() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrganizationSettingsInput) => repos.organizations.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.organization }),
  });
}

export function useUpsertUser() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) => repos.organizations.upsertUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useSaveJourneyStages() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stages: JourneyStage[]) => repos.organizations.saveJourneyStages(stages),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.organization }),
  });
}

// ------------------------------------------------------------------ assessments

export function useAssessments() {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.assessments, queryFn: () => repos.assessments.list() });
}

export function useAssessment(id: string) {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.assessment(id), queryFn: () => repos.assessments.get(id) });
}

export function useArtifacts(assessmentId: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.artifacts(assessmentId),
    queryFn: () => repos.assessments.listArtifacts(assessmentId),
  });
}

export function useArtifact(id: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.artifact(id ?? ''),
    queryFn: () => repos.assessments.getArtifact(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useLatestRun(assessmentId: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.latestRun(assessmentId),
    queryFn: () => repos.assessments.getLatestRun(assessmentId),
  });
}

/** Live run progress. Re-subscribes when `replayKey` changes (the "Replay" control). */
export function useRunProgress(runId: string | undefined, replayKey = 0): AnalysisRun | null {
  const repos = useRepositories();
  const qc = useQueryClient();
  const [run, setRun] = useState<AnalysisRun | null>(null);

  useEffect(() => {
    if (!runId) return;
    return repos.assessments.subscribeToRun(runId, (next) => {
      setRun(next);
      if (next.status === 'succeeded' || next.status === 'failed') {
        void qc.invalidateQueries({ queryKey: queryKeys.assessments });
      }
    });
  }, [repos, qc, runId, replayKey]);

  return run;
}

export function useCreateAssessment() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAssessmentInput) => repos.assessments.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.assessments }),
  });
}

// ------------------------------------------------------------------ findings

export function useFindings(assessmentId: string, filter?: FindingFilter) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.findings(assessmentId, filter),
    queryFn: () => repos.findings.list(assessmentId, filter),
  });
}

export function useFinding(id: string) {
  const repos = useRepositories();
  return useQuery({ queryKey: queryKeys.finding(id), queryFn: () => repos.findings.get(id) });
}

export function useReview(findingId: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.review(findingId),
    queryFn: () => repos.findings.getReview(findingId),
  });
}

export function useUpdateFindingStatus() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, to, note }: { ids: string[]; to: FindingStatus; note?: string }) =>
      repos.findings.updateStatus(ids, to, note),
    onSuccess: async (_result, { ids }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['findings'] }),
        qc.invalidateQueries({ queryKey: queryKeys.assessments }),
        ...ids.flatMap((id) => [
          qc.invalidateQueries({ queryKey: queryKeys.finding(id) }),
          qc.invalidateQueries({ queryKey: queryKeys.review(id) }),
        ]),
      ]);
    },
  });
}

export function useAddComment() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ findingId, body }: { findingId: string; body: string }) =>
      repos.findings.addComment(findingId, body),
    onSuccess: (review) => qc.setQueryData(queryKeys.review(review.findingId), review),
  });
}

// ------------------------------------------------------------------ rules

export function useRulePacks() {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.rulePacks,
    queryFn: () => repos.rules.listPacks(),
    staleTime: Infinity,
  });
}

export function useRulePack(patternId: PatternId) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.rulePack(patternId),
    queryFn: () => repos.rules.getPack(patternId),
    staleTime: Infinity,
  });
}

// ------------------------------------------------------------------ sample mode

/**
 * Sample-mode role switcher and reset. The current role is read from `useCurrentUser()`, which
 * refetches after a switch; clearing the query cache makes every screen reflect the change.
 */
export function useSampleMode() {
  const controls = useSampleControls();
  const qc = useQueryClient();

  return {
    enabled: controls !== null,
    setRole(next: Role) {
      controls?.setRole(next);
      void qc.invalidateQueries();
    },
    reset() {
      controls?.reset();
      void qc.resetQueries();
    },
  };
}

// ------------------------------------------------------------------ assessment inputs

export function useTestDataSets() {
  const repos = useRepositories();
  return useQuery({
    queryKey: ['test-data-sets'],
    queryFn: () => repos.organizations.listTestDataSets(),
  });
}

export function useSaveTestDataSet() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TestDataSetInput) => repos.organizations.saveTestDataSet(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-data-sets'] }),
  });
}

export function useDeleteTestDataSet() {
  const repos = useRepositories();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.organizations.deleteTestDataSet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-data-sets'] }),
  });
}

/** Sends a secret to the vault and returns only its reference. */
export function useStoreSecret() {
  const repos = useRepositories();
  return useMutation({ mutationFn: (input: StoreSecretInput) => repos.credentials.store(input) });
}

export function useUploadRepository() {
  return useRepositories().uploads;
}
