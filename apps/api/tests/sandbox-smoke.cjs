const os = require('node:os');
try {
  os.userInfo();
} catch {
  os.userInfo = () => ({
    username: process.env.USERNAME || 'devflow',
    uid: -1,
    gid: -1,
    shell: null,
    homedir: process.env.USERPROFILE || process.cwd(),
  });
}

require('tsx/cjs');

const { executeTestInSandbox } = require('../src/services/testExecutionService.ts');
const [dockerSocket, nodeImage, pythonImage, framework = 'vitest', scenario = 'pass'] = process.argv.slice(2);
if (dockerSocket) process.env.DOCKER_SOCKET = dockerSocket;
if (nodeImage) process.env.SANDBOX_NODE_IMAGE = nodeImage;
if (pythonImage) process.env.SANDBOX_PYTHON_IMAGE = pythonImage;

const isPython = framework === 'pytest';
const isJest = framework === 'jest';
const expectedTotal = scenario === 'fail' ? 6 : 5;
const testFile = {
  fileName: isPython ? 'test_add.py' : 'add.spec.ts',
  filePath: isPython ? 'tests/test_add.py' : 'tests/add.spec.ts',
  targetFilePath: isPython ? 'src/add.py' : 'src/add.ts',
  language: isPython ? 'python' : 'typescript',
  framework,
  testCases: [],
  fullCode: isPython
    ? `from src.add import add\n\ndef test_adds_two_numbers():\n    assert add(2, 3) == ${expectedTotal}\n`
    : `import { describe, it, expect${isJest ? ', jest' : ', vi'} } from '${isJest ? '@jest/globals' : 'vitest'}';
import { add } from '../src/add';

describe('add', () => {
  it('adds two numbers', () => expect(add(2, 3)).toBe(${expectedTotal}));
});
`,
};

const executionPromise = executeTestInSandbox({
  repositoryId: 'sandbox-smoke',
  commitSha: 'local',
  testFile,
  sourceCode: isPython
    ? 'def add(a, b):\n    return a + b\n'
    : 'export function add(a: number, b: number) { return a + b; }',
});
executionPromise
  .then(({ execution }) => {
    console.log(JSON.stringify({
      status: execution.status,
      totalTests: execution.totalTests,
      passedTests: execution.passedTests,
      failedTests: execution.failedTests,
      stdout: execution.stdout,
      stderr: execution.stderr,
    }, null, 2));
    const expectedStatus = scenario === 'fail' ? 'FAILED' : 'PASSED';
    const expectedPassed = scenario === 'fail' ? 0 : 1;
    const expectedFailed = scenario === 'fail' ? 1 : 0;
    if (
      execution.status !== expectedStatus ||
      execution.totalTests !== 1 ||
      execution.passedTests !== expectedPassed ||
      execution.failedTests !== expectedFailed
    ) {
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
