import type { DataSource } from '../config/data-source';
import type { Repositories, SampleControls } from './repositories';
import { createLocalStorageOverlayStore, type OverlayStore } from './sample/overlay';
import { createSampleRepositories } from './sample/sample-repositories';

export interface RepositoryContext {
  /** Sample mode: where walkthrough changes are kept. Defaults to browser localStorage. */
  overlayStore?: OverlayStore;
  latencyMs?: number;
}

export interface RepositoryBundle {
  repositories: Repositories;
  /** Present only in sample mode. */
  sampleControls: SampleControls | null;
}

/**
 * The single switch between data sources. Stage C adds a `supabase` branch here; screens are
 * unaffected because they depend only on the `Repositories` interface.
 */
export function createRepositories(
  source: DataSource,
  context: RepositoryContext = {},
): RepositoryBundle {
  switch (source) {
    case 'sample': {
      const { controls, ...repositories } = createSampleRepositories({
        store: context.overlayStore ?? createLocalStorageOverlayStore(),
        ...(context.latencyMs !== undefined ? { latencyMs: context.latencyMs } : {}),
      });
      return { repositories, sampleControls: controls };
    }
  }
}
