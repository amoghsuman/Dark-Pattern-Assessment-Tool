import 'server-only';
import { parseDataSource, type DataSource } from '@dpat/shared';

/** Server-side environment, read once per request. Never import from client components. */
export function getServerEnv(): { dataSource: DataSource } {
  return { dataSource: parseDataSource(process.env.DATA_SOURCE) };
}
