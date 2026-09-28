'use client';

import { PATTERN_IDS } from '@dpat/rules';
import { Check, ChevronLeft, ChevronRight, Rocket } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { ErrorState, PageHeader } from '@/components/common/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateAssessment, useOrganization } from '@/lib/data/hooks';
import { can, useRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  clearDraft,
  emptyDraft,
  loadDraft,
  saveDraft,
  toNewAssessmentInput,
  validateStep,
  WIZARD_STEPS,
  type StepErrors,
  type WizardDraft,
} from '@/lib/wizard/draft';

import { StepJourneys } from './step-journeys';
import { StepPatterns } from './step-patterns';
import { StepReview } from './step-review';
import { StepScope } from './step-scope';
import { StepTargets } from './step-targets';
import { StepUploads } from './step-uploads';
import { WizardContext } from './wizard-context';

const noopSubscribe = () => () => {};

/** The wizard reads its saved draft from localStorage, so it renders on the client only. */
export function NewAssessmentWizard() {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <Skeleton className="mx-auto h-96 max-w-6xl" />;
  return <WizardBody />;
}

function WizardBody() {
  const { data: organization, error } = useOrganization();
  const role = useRole();
  const router = useRouter();
  const create = useCreateAssessment();

  const [initial] = useState(() => loadDraft());
  const [draft, setDraft] = useState<WizardDraft | null>(() => initial ?? emptyDraft(PATTERN_IDS));
  const [errors, setErrors] = useState<StepErrors>({});
  const [restored, setRestored] = useState(
    () => initial !== null && (initial.name !== '' || initial.targetTypes.length > 0),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (draft) saveDraft(draft);
  }, [draft]);

  const update = useCallback(
    (patch: Partial<WizardDraft> | ((d: WizardDraft) => WizardDraft)) =>
      setDraft((d) => (d ? (typeof patch === 'function' ? patch(d) : { ...d, ...patch }) : d)),
    [],
  );

  const stages = useMemo(() => organization?.journeyStages ?? [], [organization]);
  const context = useMemo(
    () => (draft ? { draft, update, errors, stages } : null),
    [draft, update, errors, stages],
  );

  if (error) return <ErrorState error={error} />;
  if (!draft || !context || !organization) return <Skeleton className="mx-auto h-96 max-w-6xl" />;

  if (role !== null && !can.createAssessment(role)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader title="New assessment" />
        <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
          Only admins and assessors can create assessments. Switch role from the Sample data badge
          to continue.
        </p>
      </div>
    );
  }

  const current = WIZARD_STEPS[draft.step] ?? WIZARD_STEPS[0];
  const isLast = draft.step === WIZARD_STEPS.length - 1;

  const goTo = (step: number) => {
    setErrors({});
    update({ step });
    headingRef.current?.focus();
  };

  const next = () => {
    const stepErrors = validateStep(draft, current.id);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    // Default the stage scope to the stages tagged in journeys when leaving the journeys step.
    if (current.id === 'journeys' && draft.stageIds.length === 0) {
      const tagged = new Set(draft.journeys.flatMap((j) => j.steps.map((s) => s.stageId)));
      update({ stageIds: stages.filter((s) => tagged.has(s.id)).map((s) => s.id) });
    }
    goTo(draft.step + 1);
  };

  const launch = () => {
    const allErrors = validateStep(draft, 'review');
    if (Object.keys(allErrors).length > 0) {
      const firstBad = WIZARD_STEPS.findIndex(
        (s) => Object.keys(validateStep(draft, s.id)).length > 0,
      );
      toast.error('Some steps need attention');
      goTo(firstBad);
      setErrors(validateStep(draft, WIZARD_STEPS[firstBad]?.id ?? 'scope'));
      return;
    }
    create.mutate(toNewAssessmentInput(draft), {
      onSuccess: (assessment) => {
        clearDraft();
        toast.success('Assessment launched');
        router.push(`/assessments/${assessment.id}/run` as Route);
      },
      onError: (err) =>
        toast.error('Could not launch the assessment', { description: err.message }),
    });
  };

  return (
    <WizardContext.Provider value={context}>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="New assessment"
          description="Set up targets, journeys and scope. Nothing runs until you launch."
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearDraft();
                setDraft(emptyDraft(PATTERN_IDS));
                setErrors({});
                setRestored(false);
              }}
            >
              Start over
            </Button>
          }
        />
        {restored ? (
          <p className="rounded-md border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
            Restored your unfinished draft.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
          <nav aria-label="Wizard steps">
            <ol className="flex gap-1 overflow-x-auto lg:flex-col">
              {WIZARD_STEPS.map((s, i) => {
                const done = i < draft.step;
                const active = i === draft.step;
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => (i <= draft.step ? goTo(i) : undefined)}
                      disabled={i > draft.step}
                      aria-current={active ? 'step' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        active && 'bg-accent font-medium',
                        !active && i <= draft.step && 'hover:bg-accent/60',
                        i > draft.step && 'cursor-not-allowed text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums',
                          active && 'border-brand text-brand',
                          done && 'border-brand bg-brand text-brand-foreground',
                        )}
                      >
                        {done ? <Check className="size-3.5" aria-label="Completed" /> : i + 1}
                      </span>
                      <span className="whitespace-nowrap">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <Card>
            <CardContent className="space-y-6">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
                  {current.title}
                </h2>
                <p className="text-sm text-muted-foreground">{current.description}</p>
              </div>

              {current.id === 'scope' ? <StepScope /> : null}
              {current.id === 'targets' ? <StepTargets /> : null}
              {current.id === 'uploads' ? <StepUploads /> : null}
              {current.id === 'journeys' ? <StepJourneys /> : null}
              {current.id === 'patterns' ? <StepPatterns /> : null}
              {current.id === 'review' ? <StepReview goTo={goTo} /> : null}

              <div className="flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => goTo(draft.step - 1)}
                  disabled={draft.step === 0}
                >
                  <ChevronLeft />
                  Back
                </Button>
                <span className="text-xs text-muted-foreground">
                  Step {draft.step + 1} of {WIZARD_STEPS.length}
                </span>
                {isLast ? (
                  <Button onClick={launch} disabled={create.isPending}>
                    <Rocket />
                    {create.isPending ? 'Launching…' : 'Launch assessment'}
                  </Button>
                ) : (
                  <Button onClick={next}>
                    Next
                    <ChevronRight />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </WizardContext.Provider>
  );
}
