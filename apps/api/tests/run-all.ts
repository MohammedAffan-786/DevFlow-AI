import { runAuthTests } from './auth.test.ts';
import { runAuthorizationTests } from './authorization.test.ts';
import { runSecuritySanitizerTests } from './nosql-security.test.ts';
import { runGitHubIntegrationTests } from './github-integration.test.ts';
import { runAIValidationTests } from './ai-validation.test.ts';
import { runQueueTests } from './queue-processing.test.ts';
import { runSandboxIsolationTests } from './sandbox-isolation.test.ts';
import { runSandboxExecutionTests } from './sandbox-execution.test.ts';

async function main() {
  console.log('================================================================');
  console.log(' DevFlow AI: Enterprise DevSecOps Automated Verification Suite');
  console.log('================================================================\n');

  const allSuites = [
    { title: 'Authentication & Cryptography', runner: runAuthTests },
    { title: 'Role-Based Access Control (RBAC)', runner: runAuthorizationTests },
    { title: 'NoSQL & SSRF & Path Sanitization', runner: runSecuritySanitizerTests },
    { title: 'GitHub Integration & Webhook Signatures', runner: runGitHubIntegrationTests },
    { title: 'AI Schema Output Validation', runner: runAIValidationTests },
    { title: 'Queue Processing & Deduplication', runner: runQueueTests },
    { title: 'Sandbox Hardening & Container Isolation', runner: runSandboxIsolationTests },
    { title: 'Sandbox Test Execution & Generated Imports', runner: runSandboxExecutionTests },
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const suite of allSuites) {
    console.log(`\n── [Suite] ${suite.title} ──`);
    try {
      const results = await suite.runner();
      for (const res of results) {
        totalTests++;
        if (res.passed) {
          passedTests++;
          console.log(`  ✅ PASS: ${res.name}`);
        } else {
          failedTests++;
          console.error(`  ❌ FAIL: ${res.name}`);
          if (res.error) console.error(`     Error: ${res.error}`);
        }
      }
    } catch (suiteErr: any) {
      console.error(`  ❌ CRITICAL SUITE FAILURE: ${suiteErr.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(` Verification Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test execution failure:', err);
  process.exit(1);
});
