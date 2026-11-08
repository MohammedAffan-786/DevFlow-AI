import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function runSandboxPolicyTest() {
  const policyPath = path.resolve(process.cwd(), 'execution-worker/policies/resource-limits.json');
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

  assert.strictEqual(policy.limits.networkDisabled, true, 'Network access must be disabled in sandbox');
  assert.strictEqual(policy.limits.readOnlyRootfs, true, 'Root filesystem must be read-only');
  assert.strictEqual(policy.limits.user, '10001:10001', 'Container must run as non-root UID 10001');
  assert.strictEqual(policy.limits.memoryBytes, 512 * 1024 * 1024, 'Memory limit must be 512MB');

  console.log('✅ Sandbox policy constraints verified successfully');
}

runSandboxPolicyTest();
