/**
 * OmniStream Cinema Video Player — Test Harness Utilities
 * Provides assertion helpers, structured test tracking, and reporting.
 */

import assert from 'node:assert/strict';

export { assert };

export class TestReportTracker {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  record(tier, feature, testName, passed, error = null, durationMs = 0) {
    this.results.push({
      tier,
      feature,
      testName,
      passed,
      error: error ? (error.message || String(error)) : null,
      stack: error ? error.stack : null,
      durationMs
    });
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const durationTotalMs = Date.now() - this.startTime;

    const byTier = {};
    const byFeature = {};

    for (const res of this.results) {
      if (!byTier[res.tier]) byTier[res.tier] = { total: 0, passed: 0, failed: 0 };
      byTier[res.tier].total += 1;
      if (res.passed) byTier[res.tier].passed += 1;
      else byTier[res.tier].failed += 1;

      if (!byFeature[res.feature]) byFeature[res.feature] = { total: 0, passed: 0, failed: 0 };
      byFeature[res.feature].total += 1;
      if (res.passed) byFeature[res.feature].passed += 1;
      else byFeature[res.feature].failed += 1;
    }

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Number(((passed / total) * 100).toFixed(1)) : 0,
      durationTotalMs,
      byTier,
      byFeature,
      results: this.results
    };
  }

  formatMarkdownReport() {
    const summary = this.getSummary();
    let md = `# OmniStream Cinema Video Player — E2E Test Execution Report\n\n`;
    md += `**Generated**: ${new Date().toISOString()}  \n`;
    md += `**Total Tests**: ${summary.total} | **Passed**: ${summary.passed} | **Failed**: ${summary.failed} | **Pass Rate**: ${summary.passRate}% | **Duration**: ${summary.durationTotalMs}ms\n\n`;

    md += `## 1. Summary by Tier\n\n`;
    md += `| Tier | Description | Total | Passed | Failed | Pass Rate |\n`;
    md += `|---|---|---|---|---|---|\n`;

    const tierDescriptions = {
      'Tier 1': 'Feature Coverage (>=5 tests per feature)',
      'Tier 2': 'Boundary & Corner Cases (>=5 tests per feature)',
      'Tier 3': 'Cross-Feature Combinations (pairwise interactions)',
      'Tier 4': 'Real-World Application Scenarios (end-to-end workflows)'
    };

    for (const [tier, data] of Object.entries(summary.byTier)) {
      const desc = tierDescriptions[tier] || tier;
      const rate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0.0';
      md += `| ${tier} | ${desc} | ${data.total} | ${data.passed} | ${data.failed} | ${rate}% |\n`;
    }

    md += `\n## 2. Summary by Feature\n\n`;
    md += `| Feature | Total | Passed | Failed | Status |\n`;
    md += `|---|---|---|---|---|\n`;
    for (const [feat, data] of Object.entries(summary.byFeature)) {
      const status = data.failed === 0 ? '✅ PASS' : '❌ FAIL';
      md += `| ${feat} | ${data.total} | ${data.passed} | ${data.failed} | ${status} |\n`;
    }

    if (summary.failed > 0) {
      md += `\n## 3. Failed Tests Diagnostics\n\n`;
      const failedTests = this.results.filter((r) => !r.passed);
      failedTests.forEach((t, i) => {
        md += `### ${i + 1}. [${t.tier}] ${t.feature} — ${t.testName}\n`;
        md += `- **Error**: \`${t.error}\`\n\n`;
      });
    }

    return md;
  }
}

export async function runTest(tracker, tier, feature, testName, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    tracker.record(tier, feature, testName, true, null, duration);
    return true;
  } catch (err) {
    const duration = Date.now() - start;
    tracker.record(tier, feature, testName, false, err, duration);
    return false;
  }
}
