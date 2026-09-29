import type { RulePack } from '@dpat/rules';

import type { AnalysisRun } from '../schemas/analysis';
import type {
  Artifact,
  ArtifactKind,
  Assessment,
  BackendConfigTarget,
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
import type { ClientAccessItem, ConfigType, CredentialRef, TestDataSet } from '../schemas/inputs';
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
  | WithoutIds<WebsiteTarget>
  | WithoutIds<MobileAppTarget>
  | WithoutIds<CodeRepositoryTarget>
  | (Omit<WithoutIds<BackendConfigTarget>, 'configArtifactIds'> & { configUploadIds: string[] });

export interface NewJourneyInput {
  /** Index into `targets`. */
  targetIndex: number;
  name: string;
  steps: Omit<JourneyStep, 'id' | 'screenArtifactId'>[];
}

/** An upload completed through the UploadRepository, plus how it is used. */
export interface NewArtifactInput {
  upload: StoredUpload;
  /** Index into `targets`, when the file belongs to one (build, source archive, config file). */
  targetIndex?: number;
  configType?: ConfigType;
  /** Manual captures only. */
  manual?: { journeyIndex?: number; stageId: string; note: string };
}

export interface NewAssessmentInput {
  name: string;
  description?: string;
  targets: NewTargetInput[];
  journeys: NewJourneyInput[];
  patternIds: PatternId[];
  stageIds: string[];
  artifacts: NewArtifactInput[];
  /** Scope exclusions; recorded as coverage gaps. */
  coverageGaps: Assessment['coverageGaps'];
  clientAccess: ClientAccessItem[];
  launchedWithOutstanding: boolean;
}

// ---------------------------------------------------------------- uploads

/**
 * Resumable, chunked uploads. The web client hashes each chunk as it sends it and completes the
 * session with the SHA-256. Sample mode records metadata only; Stage C implements this with
 * Supabase Storage resumable (TUS) uploads.
 */
export interface StartUploadInput {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  kind: ArtifactKind;
}

export interface UploadSession {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  kind: ArtifactKind;
  /** Bytes per chunk the client should send. */
  chunkSize: number;
  uploadedBytes: number;
  status: 'in_progress' | 'completed' | 'aborted';
}

export interface StoredUpload {
  uploadId: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  kind: ArtifactKind;
  sha256: string;
  storage: 'metadata_only' | 'object_storage';
  completedAt: string;
}

export interface UploadRepository {
  start(input: StartUploadInput): Promise<UploadSession>;
  /** Stage C sends `data`; sample mode only records progress. Resumes from `uploadedBytes`. */
  appendChunk(
    sessionId: string,
    chunk: { offset: number; size: number; data?: Blob },
  ): Promise<UploadSession>;
  complete(sessionId: string, sha256: string): Promise<StoredUpload>;
  abort(sessionId: string): Promise<void>;
  /** Resume an interrupted session, e.g. after a network drop. */
  getSession(sessionId: string): Promise<UploadSession>;
}

// ---------------------------------------------------------------- secrets

export interface StoreSecretInput {
  label: string;
  username: string;
  secret: string;
}

/** Test credentials, OTPs and repository tokens go to a vault; only references are kept. */
export interface CredentialRepository {
  store(input: StoreSecretInput): Promise<CredentialRef>;
  remove(id: string): Promise<void>;
}

export type TestDataSetInput = Omit<TestDataSet, 'id' | 'organizationId' | 'createdAt'> & {
  id?: string;
};

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
  /** Reusable test data (dummy customers, payment sandbox details) shared across assessments. */
  listTestDataSets(): Promise<TestDataSet[]>;
  saveTestDataSet(input: TestDataSetInput): Promise<TestDataSet>;
  deleteTestDataSet(id: string): Promise<void>;
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
  uploads: UploadRepository;
  credentials: CredentialRepository;
}

/** Sample-mode only controls, surfaced by the Sample data badge. */
export interface SampleControls {
  getRole(): Role;
  setRole(role: Role): void;
  /** Clears every change made in this browser and returns to the fixture state. */
  reset(): void;
}
