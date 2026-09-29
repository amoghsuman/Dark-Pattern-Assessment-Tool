import { rulePackBundle } from '@dpat/rules';
import { deriveMatrix, loadSampleFixtures } from '@dpat/shared';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { buildRiskRegisterWorkbook, riskRegisterFileName } from './risk-register-xlsx';

const fx = loadSampleFixtures();
const assessment = fx.assessments.find((a) => a.id === 'asm-digital-h1')!;
const findings = fx.findings.filter((f) => f.assessmentId === assessment.id);
const matrix = deriveMatrix({
  assessment,
  stages: fx.organization.journeyStages,
  journeys: fx.journeys.filter((j) => j.assessmentId === assessment.id),
  targets: fx.targets.filter((t) => t.assessmentId === assessment.id),
  findings,
  run: fx.analysisRuns.find((r) => r.assessmentId === assessment.id) ?? null,
});

describe('Excel risk register', () => {
  it('has one row per pattern and stage and survives a round trip', async () => {
    const workbook = await buildRiskRegisterWorkbook({
      organization: fx.organization,
      assessment,
      matrix,
      findings,
      packs: rulePackBundle.packs,
      productName: 'Dark Pattern Assessment Tool',
      generatedAt: new Date('2026-09-29T06:00:00Z'),
    });
    const buffer = await workbook.xlsx.writeBuffer();

    const read = new ExcelJS.Workbook();
    await read.xlsx.load(buffer);
    const register = read.getWorksheet('Risk register')!;
    expect(register.rowCount).toBe(1 + 13 * 9);
    expect(register.getRow(1).getCell(1).value).toBe('Pattern');

    const drip = register
      .getSheetValues()
      .find(
        (row) => Array.isArray(row) && row[1] === 'Drip Pricing' && row[3] === 'Payment',
      ) as unknown[];
    expect(drip[4]).toBe('Non-compliant');
    expect(drip[10]).toBe('ELI-2026-024, ELI-2026-025');

    expect(read.getWorksheet('Findings')!.rowCount).toBe(1 + 41);
    const about = read.getWorksheet('About')!;
    expect(
      about.getSheetValues().some((r) => Array.isArray(r) && r[2] === 'ccpa-2023@0.1.0-draft'),
    ).toBe(true);
  });

  it('names the file after the assessment and date', () => {
    expect(riskRegisterFileName(assessment, new Date('2026-09-29T06:00:00Z'))).toBe(
      'risk-register-digital-journeys-review-h1-fy2026-27-2026-09-29.xlsx',
    );
  });
});
