import { z } from 'zod';

import analysisRunsJson from '../../../fixtures/analysis-runs.json';
import artifactsJson from '../../../fixtures/artifacts.json';
import assessmentsJson from '../../../fixtures/assessments.json';
import findingsJson from '../../../fixtures/findings.json';
import journeysJson from '../../../fixtures/journeys.json';
import organizationJson from '../../../fixtures/organization.json';
import reviewsJson from '../../../fixtures/reviews.json';
import targetsJson from '../../../fixtures/targets.json';
import testDataSetsJson from '../../../fixtures/test-data-sets.json';
import usersJson from '../../../fixtures/users.json';
import { AnalysisRunSchema } from '../../schemas/analysis';
import {
  ArtifactSchema,
  AssessmentSchema,
  JourneySchema,
  TargetSchema,
} from '../../schemas/assessment';
import { FindingSchema, ReviewSchema } from '../../schemas/finding';
import { TestDataSetSchema } from '../../schemas/inputs';
import { OrganizationSchema, UserSchema } from '../../schemas/organization';

/** Validated sample data for the fictitious insurer "Example Life Insurance". */
export interface SampleFixtures {
  organization: z.infer<typeof OrganizationSchema>;
  users: z.infer<typeof UserSchema>[];
  assessments: z.infer<typeof AssessmentSchema>[];
  targets: z.infer<typeof TargetSchema>[];
  journeys: z.infer<typeof JourneySchema>[];
  artifacts: z.infer<typeof ArtifactSchema>[];
  analysisRuns: z.infer<typeof AnalysisRunSchema>[];
  findings: z.infer<typeof FindingSchema>[];
  reviews: z.infer<typeof ReviewSchema>[];
  testDataSets: z.infer<typeof TestDataSetSchema>[];
}

let cached: SampleFixtures | undefined;

/** Parses every fixture file once. Throws with the zod issue path if a fixture is invalid. */
export function loadSampleFixtures(): SampleFixtures {
  cached ??= {
    organization: OrganizationSchema.parse(organizationJson),
    users: z.array(UserSchema).parse(usersJson),
    assessments: z.array(AssessmentSchema).parse(assessmentsJson),
    targets: z.array(TargetSchema).parse(targetsJson),
    journeys: z.array(JourneySchema).parse(journeysJson),
    artifacts: z.array(ArtifactSchema).parse(artifactsJson),
    analysisRuns: z.array(AnalysisRunSchema).parse(analysisRunsJson),
    findings: z.array(FindingSchema).parse(findingsJson),
    reviews: z.array(ReviewSchema).parse(reviewsJson),
    testDataSets: z.array(TestDataSetSchema).parse(testDataSetsJson),
  };
  return cached;
}

/** User ID used for history entries raised by the analysis engines. */
export const SYSTEM_USER_ID = 'system';
