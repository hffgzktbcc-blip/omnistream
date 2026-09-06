#!/usr/bin/env node

/**
 * OmniStream Cinema Video Player — Master E2E Test Runner
 * Executes Tiers 1-4 with structured reporting, summary statistics, and exit codes.
 *
 * Usage:
 *   node tests/e2e/runner.js
 *   node tests/e2e/runner.js --tier=1
 *   node tests/e2e/runner.js --tier=1,2,3,4
 *   node tests/e2e/runner.js --live (runs against http://localhost:3001)
 */

import { TestReportTracker } from '../harness/test-utils.js';
import { MockStreamServer } from '../harness/mock-server.js';
import { runTier1FeatureTests } from './tier1-feature-coverage.test.js';
import { runTier2BoundaryTests } from './tier2-boundary-corner.test.js';
import { runTier3CombinationTests } from './tier3-combinations.test.js';
import { runTier4ScenarioTests } from './tier4-scenarios.test.js';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const tierArg = args.find((a) => a.startsWith('--tier='));
  const selectedTiers = tierArg
    ? tierArg.replace('--tier=', '').split(',').map((t) => t.trim())
    : ['1', '2', '3', '4'];

  const port = 3099;
  const baseUrl = isLive ? 'http://localhost:3001' : `http://localhost:${port}`;

  console.log(`\n============================================================`);
  console.log(`  OmniStream Cinema Video Player — E2E Test Suite Runner`);
  console.log(`  Mode: ${isLive ? 'LIVE SERVER (3001)' : 'STANDALONE MOCK HARNESS (3099)'}`);
  console.log(`  Selected Tiers: [${selectedTiers.join(', ')}]`);
  console.log(`============================================================\n`);

  let mockServer = null;
  if (!isLive) {
    mockServer = new MockStreamServer(port);
    await mockServer.start();
    console.log(`✔ Reference Mock Server started on port ${port}\n`);
  }

  const tracker = new TestReportTracker();

  try {
    if (selectedTiers.includes('1')) {
      console.log(`▶ Executing Tier 1: Feature Coverage (>=5 tests/feature, 24 features)...`);
      await runTier1FeatureTests(tracker, { baseUrl });
    }

    if (selectedTiers.includes('2')) {
      console.log(`▶ Executing Tier 2: Boundary & Corner Cases (>=5 tests/feature, 24 features)...`);
      await runTier2BoundaryTests(tracker, { baseUrl });
    }

    if (selectedTiers.includes('3')) {
      console.log(`▶ Executing Tier 3: Cross-Feature Combinations (Pairwise)...`);
      await runTier3CombinationTests(tracker, { baseUrl });
    }

    if (selectedTiers.includes('4')) {
      console.log(`▶ Executing Tier 4: Real-World Application Scenarios (Workflows)...`);
      await runTier4ScenarioTests(tracker, { baseUrl });
    }
  } finally {
    if (mockServer) {
      await mockServer.stop();
      console.log(`✔ Reference Mock Server stopped cleanly.\n`);
    }
  }

  const summary = tracker.getSummary();
  const mdReport = tracker.formatMarkdownReport();

  // Print Summary Table
  console.log(`\n------------------------------------------------------------`);
  console.log(`  E2E Test Execution Summary`);
  console.log(`------------------------------------------------------------`);
  console.log(`  Total Tests Run : ${summary.total}`);
  console.log(`  Passed          : ${summary.passed}`);
  console.log(`  Failed          : ${summary.failed}`);
  console.log(`  Pass Rate       : ${summary.passRate}%`);
  console.log(`  Duration        : ${summary.durationTotalMs}ms`);
  console.log(`------------------------------------------------------------\n`);

  console.log(`Results by Tier:`);
  for (const [tier, data] of Object.entries(summary.byTier)) {
    const rate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0.0';
    console.log(`  ${tier.padEnd(8)}: ${data.passed}/${data.total} passed (${rate}%)`);
  }
  console.log(``);

  // Write report file
  const reportPath = path.resolve('tests/test-report.md');
  fs.writeFileSync(reportPath, mdReport, 'utf8');
  console.log(`✔ Detailed report written to ${reportPath}\n`);

  if (summary.failed > 0) {
    console.log(`❌ Some tests failed (${summary.failed}/${summary.total}). Check tests/test-report.md for details.`);
    process.exit(1);
  } else {
    console.log(`✅ 100% of tests passed (${summary.passed}/${summary.total}). Test suite verification successful!\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
