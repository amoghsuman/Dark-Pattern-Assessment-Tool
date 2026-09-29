import type { AnalysisRun } from '../../schemas/analysis';
import type { Artifact, Assessment, Journey, Target } from '../../schemas/assessment';
import type { FindingStatus, Regulator, Role, Sector } from '../../schemas/common';
import type { ReviewComment, StatusChange } from '../../schemas/finding';
import type { TestDataSet } from '../../schemas/inputs';
import type { JourneyStage, User } from '../../schemas/organization';

/**
 * Changes made in sample mode, layered over the immutable fixtures. Persisted per browser
 * (localStorage) so a walkthrough survives navigation and refresh; "Reset sample data" clears it.
 */
export interface OverlayState {
  version: 1;
  role: Role;
  findingStatus: Record<string, { status: FindingStatus; updatedAt: string }>;
  reviewAdditions: Record<string, { history: StatusChange[]; comments: ReviewComment[] }>;
  createdAssessments: {
    assessment: Assessment;
    targets: Target[];
    journeys: Journey[];
    artifacts: Artifact[];
    run: AnalysisRun;
  }[];
  organization?: { name: string; sector: Sector; regulator?: Regulator };
  journeyStages?: JourneyStage[];
  users: Record<string, User>;
  /** Created or edited test data sets, and IDs of deleted fixture sets. */
  testDataSets: Record<string, TestDataSet>;
  deletedTestDataSetIds: string[];
}

export function emptyOverlay(role: Role = 'admin'): OverlayState {
  return {
    version: 1,
    role,
    findingStatus: {},
    reviewAdditions: {},
    createdAssessments: [],
    users: {},
    testDataSets: {},
    deletedTestDataSetIds: [],
  };
}

export interface OverlayStore {
  load(): OverlayState;
  save(state: OverlayState): void;
  clear(): void;
}

export function createMemoryOverlayStore(initial: OverlayState = emptyOverlay()): OverlayStore {
  let state = structuredClone(initial);
  return {
    load: () => structuredClone(state),
    save: (next) => {
      state = structuredClone(next);
    },
    clear: () => {
      state = emptyOverlay();
    },
  };
}

/** The subset of the Web Storage API used here (the shared package has no DOM types). */
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const OVERLAY_STORAGE_KEY = 'dpat.sample-overlay.v1';

/**
 * Browser store. Storage can be unavailable (private mode, blocked site data); every access is
 * guarded and falls back to in-memory state so the app still works for the session.
 */
export function createLocalStorageOverlayStore(key: string = OVERLAY_STORAGE_KEY): OverlayStore {
  const memory = createMemoryOverlayStore();

  const storage = (): StorageLike | null => {
    try {
      // Accessing localStorage can throw when site data is blocked.
      return (
        (globalThis as { window?: { localStorage?: StorageLike } }).window?.localStorage ?? null
      );
    } catch {
      return null;
    }
  };

  return {
    load() {
      try {
        const raw = storage()?.getItem(key);
        if (!raw) return memory.load();
        const parsed = JSON.parse(raw) as Partial<OverlayState>;
        if (parsed.version !== 1) return emptyOverlay();
        return { ...emptyOverlay(), ...parsed };
      } catch {
        return memory.load();
      }
    },
    save(state) {
      memory.save(state);
      try {
        storage()?.setItem(key, JSON.stringify(state));
      } catch {
        // Quota exceeded or storage blocked: keep the in-memory copy.
      }
    },
    clear() {
      memory.clear();
      try {
        storage()?.removeItem(key);
      } catch {
        // Ignore.
      }
    },
  };
}
