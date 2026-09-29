import type {
  AssessmentStatus,
  Engine,
  FindingStatus,
  JourneyStepAction,
  MatrixCellState,
  Role,
  Sector,
  Severity,
  TargetType,
} from '../schemas/common';
import type { ConfigType, RepositoryProvider } from '../schemas/inputs';

/** Display labels. Screens use these rather than formatting enum values themselves. */

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Most severe first. */
export const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  detected: 'Detected',
  under_review: 'Under Review',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
  remediation_in_progress: 'Remediation in Progress',
  closed: 'Closed',
};

export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: 'Draft',
  queued: 'Queued',
  running: 'Running',
  in_review: 'In review',
  completed: 'Completed',
};

export const ENGINE_LABELS: Record<Engine, string> = {
  screen_capture: 'Screen capture',
  code_analysis: 'Code analysis',
  backend_logic: 'Backend and logic',
  software_risk: 'Software risk',
  correlation: 'Correlation',
};

export const ENGINE_ORDER: readonly Engine[] = [
  'screen_capture',
  'code_analysis',
  'backend_logic',
  'software_risk',
  'correlation',
];

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  website: 'Website',
  mobile_app: 'Mobile app',
  code_repository: 'Code repository',
  backend_config: 'Backend configuration',
};

export const CONFIG_TYPE_LABELS: Record<ConfigType, string> = {
  notification_schedule: 'Notification schedule',
  pricing_rules: 'Pricing and fee rules',
  cms_export: 'CMS export',
  feature_flags: 'Feature flags',
  communication_template: 'Communication templates',
};

export const REPOSITORY_PROVIDER_LABELS: Record<RepositoryProvider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  assessor: 'Assessor',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

export const SECTOR_LABELS: Record<Sector, string> = {
  insurance: 'Insurance',
  banking: 'Banking',
  lending: 'Lending',
  payments: 'Payments',
  other: 'Other',
};

export const JOURNEY_STEP_ACTION_LABELS: Record<JourneyStepAction, string> = {
  navigate: 'Navigate',
  click: 'Click',
  fill: 'Fill',
  wait: 'Wait',
  capture: 'Capture',
};

export const MATRIX_CELL_STATE_LABELS: Record<MatrixCellState, string> = {
  non_compliant: 'Non-compliant',
  in_progress: 'Under review or remediation',
  compliant: 'Assessed and compliant',
  not_assessed: 'Not yet assessed',
};
