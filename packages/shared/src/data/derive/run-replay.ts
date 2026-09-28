import type { AnalysisRun, EngineRun } from '../../schemas/analysis';

/**
 * Builds the sequence of run snapshots that the run view animates through, ending exactly at
 * `run`. Engines start in pipeline order; each reveals its events one at a time. An engine that
 * is still running in `run` stays running in the final frame; pending engines stay pending.
 */
export function buildRunReplay(run: AnalysisRun): AnalysisRun[] {
  const pending = (engine: EngineRun): EngineRun => ({
    engine: engine.engine,
    status: 'pending',
    events: [],
    metrics: { itemsTotal: engine.metrics.itemsTotal, itemsProcessed: 0, findingsRaised: 0 },
  });

  const current: EngineRun[] = run.engines.map(pending);
  const frames: AnalysisRun[] = [];
  const { completedAt: _completedAt, ...inProgress } = run;
  const snapshot = (status: AnalysisRun['status']) => {
    frames.push({ ...inProgress, status, engines: structuredClone(current) });
  };

  snapshot('running');
  run.engines.forEach((final, index) => {
    if (final.status === 'pending') return;
    const { itemsTotal, itemsProcessed, findingsRaised } = final.metrics;
    const startedAt = final.startedAt;
    current[index] = { ...pending(final), status: 'running', ...(startedAt ? { startedAt } : {}) };
    snapshot('running');

    const count = final.events.length;
    final.events.forEach((_event, i) => {
      const isLast = i === count - 1;
      current[index] = {
        ...current[index]!,
        events: final.events.slice(0, i + 1),
        metrics: {
          itemsTotal,
          itemsProcessed: Math.round((itemsProcessed * (i + 1)) / count),
          findingsRaised: isLast && final.status !== 'running' ? findingsRaised : 0,
        },
      };
      snapshot('running');
    });
    current[index] = structuredClone(final);
  });

  frames.push(structuredClone(run));
  return frames;
}
