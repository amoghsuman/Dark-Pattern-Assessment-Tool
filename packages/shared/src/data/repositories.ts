import type { RulePack } from '@dpat/rules';

import type { AnalysisRun } from '../schemas/analysis';
import type {
  Artifact,
  Assessment,
  CodeRepositoryTarget,
  Journey,
  JourneyStep,
  MobileAppTarget,
  Target,
  WebsiteTarget,
} from '../schemas/assessment';
import type {
  Engine,
  FindingStatus,
  PatternId,
  Regulator,
  Role,
  Sector,
  Severity,
} from '../schemas/common';
import type { Finding, Review } from '../schemas/finding';
import type { JourneyStage, Organization, User } from '../schemas/organization';

/**
 * The data seam. Every screen reaches data only through these interfaces (via the hooks in
 * apps/web/lib/data). Stage A implements them over JSON fixtures; Stage C adds Supabase.
 * All methods are async and return validated domain objects.
 */

// ---------------------------------------------------------------- read models

export type RiskRating = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface RiskSummary {
  /** Open findings (not dismissed or closed) by severity. */
  openBySeverity: Record<Severity, number>;
  totalFindings: number;
  openFindings: number;
  rating: RiskRating;
}

export interface AssessmentSummary {
  assessment: Assessment;
  targets: Target[];
  risk: RiskSummary;
}

export interface AssessmentDetail {
  assessment: Assessment;
  targets: Target[];
  journeys: Journey[];
}

// ---------------------------------------------------------------- inputs

type WithoutIds<T> = Omit<T, 'id' | 'assessmentId'>;

export type NewTargetInput =
  WithoutIds<WebsiteTarget> | WithoutIds<MobileAppTarget> | WithoutIds<CodeRepositoryTarget>;

export interface NewJourneyInput {
  /** Index into `targets`. */
  targetIndex: number;
  name: string;
  steps: Omit<JourneyStep, 'id' | 'screenArtifactId'>[];
}

export interface NewAssessmentInput {
  name: string;
  description?: string;
  targets: NewTargetInput[];
  journeys: NewJourneyInput[];
  patternIds: PatternId[];
  stageIds: string[];
  /** File names chosen in the upload step (metadata only in Stage A). */
  uploads: { fileName: string; sizeBytes: number; kind: Artifact['kind'] }[];
}

export interface FindingFilter {
  patternIds?: PatternId[];
  stageIds?: string[];
  severities?: Severity[];
  statuses?: FindingStatus[];
  engines?: Engine[];
  targetIds?: string[];
  /** Inclusive, 0..1. */
  minConfidence?: number;
  maxConfidence?: number;
  /** Case-insensitive match on reference, title, summary and evidence file paths. */
  search?: string;
}

export interface StatusUpdateResult {
  updated: Finding[];
  skipped: { findingId: string; reason: string }[];
}

export type UserInput = Omit<User, 'id' | 'organizationId'> & { id?: string };

export interface OrganizationSettingsInput {
  name: string;
  sector: Sector;
  regulator?: Regulator;
}

// ---------------------------------------------------------------- repositories

export interface OrganizationRepository {
  getCurrent(): Promise<Organization>;
  update(input: OrganizationSettingsInput): Promise<Organization>;
  listUsers(): Promise<User[]>;
  upsertUser(input: UserInput): Promise<User>;
  /** Replaces the ordered stage list. Rejects removing a stage that has findings. */
  saveJourneyStages(stages: JourneyStage[]): Promise<JourneyStage[]>;
  /** The signed-in user (sample mode: the selected role's user). */
  getCurrentUser(): Promise<User>;
}

export interface AssessmentRepository {
  list(): Promise<AssessmentSummary[]>;
  get(id: string): Promise<AssessmentDetail>;
  create(input: NewAssessmentInput): Promise<Assessment>;
  listArtifacts(assessmentId: string): Promise<Artifact[]>;
  getArtifact(id: string): Promise<Artifact>;
  getLatestRun(assessmentId: string): Promise<AnalysisRun | null>;
  /**
   * Streams run progress. Sample mode replays the fixture run on a timer;
   * Stage C uses Supabase Realtime. Returns an unsubscribe function.
   */
  subscribeToRun(runId: string, onUpdate: (run: AnalysisRun) => void): () => void;
}

export interface FindingRepository {
  list(assessmentId: string, filter?: FindingFilter): Promise<Finding[]>;
  get(id: string): Promise<Finding>;
  getReview(findingId: string): Promise<Review>;
  /** Single and bulk status changes. Invalid or unauthorised changes are skipped, not thrown. */
  updateStatus(findingIds: string[], to: FindingStatus, note?: string): Promise<StatusUpdateResult>;
  addComment(findingId: string, body: string): Promise<Review>;
}

export interface RuleRepository {
  listPacks(): Promise<RulePack[]>;
  getPack(patternId: PatternId): Promise<RulePack>;
  getPackSetVersion(): Promise<string>;
}

export interface Repositories {
  source: 'sample' | 'supabase';
  organizations: OrganizationRepository;
  assessments: AssessmentRepository;
  findings: FindingRepository;
  rules: RuleRepository;
}

/** Sample-mode only controls, surfaced by the Sample data badge. */
export interface SampleControls {
  getRole(): Role;
  setRole(role: Role): void;
  /** Clears every change made in this browser and returns to the fixture state. */
  reset(): void;
}
