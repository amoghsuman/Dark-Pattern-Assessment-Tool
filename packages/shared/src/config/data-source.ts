import { z } from 'zod';

/**
 * Which repository implementation backs the app. Stage A ships only `sample`;
 * `supabase` is added in Stage C without changing any screen.
 */
export const DataSourceSchema = z.enum(['sample']);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const DEFAULT_DATA_SOURCE: DataSource = 'sample';

/** Parses the DATA_SOURCE env value, falling back to `sample` when unset. */
export function parseDataSource(value: string | undefined): DataSource {
  if (value === undefined || value.trim() === '') return DEFAULT_DATA_SOURCE;
  const result = DataSourceSchema.safeParse(value.trim().toLowerCase());
  if (!result.success) {
    throw new Error(
      `Invalid DATA_SOURCE "${value}". Expected one of: ${DataSourceSchema.options.join(', ')}.`,
    );
  }
  return result.data;
}
