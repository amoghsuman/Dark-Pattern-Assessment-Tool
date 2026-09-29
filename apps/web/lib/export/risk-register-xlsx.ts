import type { RulePack } from '@dpat/rules';
import {
  deriveRiskRegister,
  ENGINE_LABELS,
  FINDING_STATUS_LABELS,
  SEVERITY_LABELS,
  type Assessment,
  type ComplianceMatrix,
  type Finding,
  type Organization,
} from '@dpat/shared';
import type ExcelJS from 'exceljs';

export interface RiskRegisterInput {
  organization: Organization;
  assessment: Assessment;
  matrix: ComplianceMatrix;
  findings: Finding[];
  packs: RulePack[];
  productName: string;
  generatedAt: Date;
}

/** ARGB fills for the compliance state column, matching the on-screen matrix. */
const STATE_FILLS: Record<string, { fill: string; font: string }> = {
  'Non-compliant': { fill: 'FFD33B36', font: 'FFFFFFFF' },
  'Under review or remediation': { fill: 'FFE2A520', font: 'FF1B1F2B' },
  'Assessed and compliant': { fill: 'FFD7EFE1', font: 'FF1B1F2B' },
  'Not yet assessed': { fill: 'FFE9ECF1', font: 'FF4B5563' },
};

const HEADER_FILL = 'FF1F2937';

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 30;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

/**
 * Builds the Excel risk register: one row per pattern × journey stage, plus a findings sheet and
 * an "About" sheet recording the rule pack set version for audit traceability.
 */
export async function buildRiskRegisterWorkbook(
  input: RiskRegisterInput,
): Promise<ExcelJS.Workbook> {
  const { default: Excel } = await import('exceljs');
  const { organization, assessment, matrix, findings, packs } = input;
  const workbook = new Excel.Workbook();
  workbook.creator = input.productName;
  workbook.created = input.generatedAt;

  // ---------------------------------------------------------------- Risk register
  const register = workbook.addWorksheet('Risk register');
  register.columns = [
    { header: 'Pattern', key: 'patternName', width: 24 },
    { header: 'Guideline clause', key: 'guidelineClause', width: 34 },
    { header: 'Journey stage', key: 'stageName', width: 24 },
    { header: 'Compliance state', key: 'complianceState', width: 26 },
    { header: 'Marker', key: 'marker', width: 16 },
    { header: 'Findings', key: 'findingCount', width: 10 },
    { header: 'Open', key: 'openCount', width: 8 },
    { header: 'Highest severity', key: 'highestSeverity', width: 14 },
    { header: 'Status breakdown', key: 'statusBreakdown', width: 34 },
    { header: 'Finding references', key: 'findingReferences', width: 30 },
    { header: 'Remediation owners', key: 'remediationOwners', width: 28 },
    { header: 'Earliest target date', key: 'earliestTargetDate', width: 16 },
    { header: 'Rule pack', key: 'rulePackId', width: 26 },
    { header: 'Rule pack version', key: 'rulePackVersion', width: 12 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];
  for (const row of deriveRiskRegister(matrix, findings, packs)) {
    const added = register.addRow(row);
    const style = STATE_FILLS[row.complianceState];
    if (style) {
      const cell = added.getCell('complianceState');
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
      cell.font = { color: { argb: style.font }, bold: row.complianceState === 'Non-compliant' };
    }
    added.alignment = { vertical: 'top', wrapText: true };
  }
  styleHeader(register);

  // ---------------------------------------------------------------- Findings
  const stageName = new Map(matrix.stages.map((s) => [s.id, s.name]));
  const patternName = new Map(packs.map((p) => [p.pattern_id, p.name]));
  const sheet = workbook.addWorksheet('Findings');
  sheet.columns = [
    { header: 'Reference', key: 'reference', width: 14 },
    { header: 'Title', key: 'title', width: 50 },
    { header: 'Pattern', key: 'pattern', width: 22 },
    { header: 'Journey stage', key: 'stage', width: 22 },
    { header: 'Severity', key: 'severity', width: 10 },
    { header: 'Status', key: 'status', width: 22 },
    { header: 'Engine', key: 'engine', width: 18 },
    { header: 'Confidence', key: 'confidence', width: 11 },
    { header: 'Criteria met', key: 'criteria', width: 22 },
    { header: 'Rule pack', key: 'rulePack', width: 30 },
    { header: 'Remediation', key: 'remediation', width: 60 },
    { header: 'Owner', key: 'owner', width: 20 },
    { header: 'Target date', key: 'targetDate', width: 12 },
  ];
  for (const f of findings) {
    sheet.addRow({
      reference: f.reference,
      title: f.title,
      pattern: patternName.get(f.patternId) ?? f.patternId,
      stage: stageName.get(f.stageId) ?? f.stageId,
      severity: SEVERITY_LABELS[f.severity],
      status: FINDING_STATUS_LABELS[f.status],
      engine: ENGINE_LABELS[f.engine],
      confidence: f.confidence,
      criteria: f.violationCriterionIds.join(', '),
      rulePack: `${f.rulePackId} v${f.rulePackVersion}`,
      remediation: f.remediation.guidance,
      owner: f.remediation.ownerTeam ?? '',
      targetDate: f.remediation.targetDate ?? '',
    }).alignment = { vertical: 'top', wrapText: true };
  }
  sheet.getColumn('confidence').numFmt = '0%';
  styleHeader(sheet);

  // ---------------------------------------------------------------- About
  const about = workbook.addWorksheet('About');
  about.columns = [
    { header: 'Field', key: 'field', width: 26 },
    { header: 'Value', key: 'value', width: 80 },
  ];
  const rows: [string, string][] = [
    ['Organisation', organization.name],
    ['Assessment', assessment.name],
    ['Assessment status', assessment.status],
    ['Rule pack set', assessment.rulePackSetVersion],
    ['Rule pack status', 'Draft, pending compliance review'],
    ['Generated', input.generatedAt.toISOString()],
    ['Generated by', input.productName],
    ['Rows', 'One row per dark pattern (13) and journey stage'],
  ];
  for (const [field, value] of rows) about.addRow({ field, value });
  styleHeader(about);

  return workbook;
}

export function riskRegisterFileName(assessment: Assessment, date: Date): string {
  const slug = assessment.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `risk-register-${slug}-${date.toISOString().slice(0, 10)}.xlsx`;
}

/** Browser download. */
export async function downloadWorkbook(
  workbook: ExcelJS.Workbook,
  fileName: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
