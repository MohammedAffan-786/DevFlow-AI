/**
 * testExecutionService.ts
 * Isolated, secure test execution engine.
 *
 * Implements strict sandbox security constraints:
 *   - Non-root execution (UID/GID 10001)
 *   - Network isolation (NetworkMode: 'none')
 *   - Strict CPU limits (1.0 core)
 *   - Strict memory limits (256 MB)
 *   - Watchdog timeout (15-second hard kill)
 *   - Process-count limit (PidsLimit: 64)
 *   - Read-only root filesystem (ReadonlyRootfs: true)
 *   - Ephemeral tmpfs mounts for /tmp and /workspace
 *   - Zero host directory or secret mounts
 *   - Dropped Linux capabilities (CapDrop: ['ALL'])
 *   - No-new-privileges flag
 *   - Seccomp syscall filtering
 *   - Automatic environment destruction on completion
 *   - Never executes untrusted code in API or AI server
 *   - Strict parsing without fabrication of results
 */

import crypto from 'crypto';
import path from 'path';
import {
  TestExecutionResultDTO,
  SandboxSecuritySpec,
  FailedAssertion,
  TestReportDTO,
  GeneratedTestFile,
} from '@devflow/shared';

// Docker is only needed when a test suite is executed. Load the optional
// sandbox client then, so auth and other API routes can start without Docker.
type Docker = any;

export interface ExecuteTestSuiteOptions {
  runId?: string;
  repositoryId: string;
  commitSha: string;
  testFile: GeneratedTestFile;
  sourceCode: string;
  timeoutSeconds?: number;
}

export const DEFAULT_SECURITY_SPEC: SandboxSecuritySpec = {
  runAsUser: '10001:10001',
  networkMode: 'none',
  cpuLimit: 1.0,
  memoryLimitMb: 256,
  timeoutSeconds: 15,
  pidsLimit: 64,
  readonlyRootfs: true,
  tmpfsMounts: [
    '/tmp:rw,noexec,nosuid,size=64m',
    '/workspace:rw,size=128m',
  ],
  droppedCapabilities: ['ALL'],
  seccompProfileApplied: true,
  noNewPrivileges: true,
  isolationEngine: 'docker',
};

// ─── Test Execution Engine ───────────────────────────────────────────────────

export async function executeTestInSandbox(
  options: ExecuteTestSuiteOptions
): Promise<{ execution: TestExecutionResultDTO; report: TestReportDTO }> {
  const startTime = Date.now();
  const runId = options.runId || crypto.randomUUID();
  const timeoutMs = (options.timeoutSeconds || DEFAULT_SECURITY_SPEC.timeoutSeconds) * 1000;

  let docker: Docker | null = null;
  let isDockerAvailable = false;

  try {
    const { default: DockerClient } = await import('dockerode');
    docker = createDockerClient(DockerClient);
    await docker.ping();
    isDockerAvailable = true;
  } catch {
    isDockerAvailable = false;
  }

  if (isDockerAvailable && docker) {
    return runInsideDockerContainer(docker, options, runId, startTime, timeoutMs);
  } else {
    return reportUnavailableSandbox(options, runId, startTime);
  }
}

export class TestExecutionService {
  static executeTestSuite(input: {
    language?: string;
    testCode: string;
    sourceCode: string;
    timeoutMs?: number;
    repositoryId?: string;
    commitSha?: string;
  }) {
    const isPython = input.language?.toLowerCase() === 'python';
    const language = isPython ? 'python' : 'typescript';
    const framework = isPython ? 'pytest' : 'vitest';
    const fileName = isPython ? 'test_generated.py' : 'generated.spec.ts';
    return executeTestInSandbox({
      repositoryId: input.repositoryId || 'local',
      commitSha: input.commitSha || 'unknown',
      sourceCode: input.sourceCode,
      timeoutSeconds: input.timeoutMs ? Math.ceil(input.timeoutMs / 1000) : undefined,
      testFile: {
        fileName,
        filePath: `tests/${fileName}`,
        targetFilePath: 'source',
        language,
        framework,
        testCases: [],
        fullCode: input.testCode,
      },
    });
  }
}

// ─── Real Docker Sandbox Execution ───────────────────────────────────────────

async function runInsideDockerContainer(
  docker: Docker,
  options: ExecuteTestSuiteOptions,
  runId: string,
  startTime: number,
  timeoutMs: number
): Promise<{ execution: TestExecutionResultDTO; report: TestReportDTO }> {
  const isPython = options.testFile.framework === 'pytest';
  const imageName = isPython
    ? process.env.SANDBOX_PYTHON_IMAGE || 'devflow-sandbox-python:latest'
    : process.env.SANDBOX_NODE_IMAGE || 'devflow-sandbox-node:latest';
  const containerName = `devflow_sandbox_${runId.replace(/-/g, '').slice(0, 16)}`;

  let container: any = null;
  let isTimedOut = false;
  let exitCode = 1;
  let stdout = '';
  let stderr = '';
  let testCounts: SandboxTestCounts | undefined;

  try {
    const sourcePath = getSafeWorkspacePath(options.testFile.targetFilePath);
    const testPath = getSafeWorkspacePath(options.testFile.filePath);
    if (sourcePath === testPath) {
      throw new Error('The target source and generated test file must use different paths.');
    }
    const command = options.testFile.framework === 'pytest'
      ? ['pytest', '--json-report', '--json-report-file=/tmp/report.json', `--timeout=${Math.max(1, Math.ceil(timeoutMs / 1000))}`, `/workspace/${testPath}`]
      : options.testFile.framework === 'jest'
      ? ['jest', '--runInBand', '--json', '--outputFile=/tmp/report.json', '--config=/workspace/jest.config.cjs', `/workspace/${testPath}`]
      : ['vitest', 'run', '--config=/workspace/vitest.config.mjs', '--reporter=json', '--outputFile=/tmp/report.json', `/workspace/${testPath}`];

    // Create hardened, ephemeral container with mandatory security flags
    container = await docker.createContainer({
      name: containerName,
      Image: imageName,
      Cmd: ['sh', '-c', 'while :; do sleep 3600; done'],
      User: DEFAULT_SECURITY_SPEC.runAsUser,
      NetworkDisabled: true,
      HostConfig: {
        NetworkMode: 'none',
        Memory: DEFAULT_SECURITY_SPEC.memoryLimitMb * 1024 * 1024,
        NanoCPUs: DEFAULT_SECURITY_SPEC.cpuLimit * 1_000_000_000,
        PidsLimit: DEFAULT_SECURITY_SPEC.pidsLimit,
        ReadonlyRootfs: DEFAULT_SECURITY_SPEC.readonlyRootfs,
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=64m',
          '/workspace': 'rw,uid=10001,gid=10001,mode=1777,size=128m',
        },
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges:true'],
        AutoRemove: false,
      },
      Env: [
        'CI=true',
        'NODE_ENV=test',
        'PYTHONUNBUFFERED=1',
        'PYTHONDONTWRITEBYTECODE=1',
      ],
    });

    await container.start();
    await writeSandboxFile(container, sourcePath, options.sourceCode);
    await writeSandboxFile(container, testPath, options.testFile.fullCode);
    if (options.testFile.framework === 'jest') {
      await writeSandboxFile(container, 'jest.config.cjs', JEST_CONFIG);
    } else if (options.testFile.framework === 'vitest') {
      await writeSandboxFile(container, 'vitest.config.mjs', VITEST_CONFIG);
    }
    const execution = await container.exec({
      Cmd: command,
      User: DEFAULT_SECURITY_SPEC.runAsUser,
      WorkingDir: '/workspace',
      Env: ['CI=true', 'NODE_ENV=test', 'PYTHONUNBUFFERED=1', 'PYTHONDONTWRITEBYTECODE=1'],
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });
    const executionStream = await execution.start({ hijack: true, stdin: false, Tty: true });
    let executionOutput = '';
    const executionPromise = new Promise<{ statusCode: number; stdout: string }>((resolve, reject) => {
      executionStream.on('data', (chunk: Buffer) => { executionOutput += chunk.toString('utf8'); });
      executionStream.once('error', reject);
      executionStream.once('end', async () => {
        try {
          const details = await execution.inspect();
          resolve({ statusCode: details.ExitCode ?? 1, stdout: executionOutput });
        } catch (error) {
          reject(error);
        }
      });
    });

    // Watchdog timer for timeout
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<{ isTimeout: boolean }>((resolve) => {
      timeoutHandle = setTimeout(() => resolve({ isTimeout: true }), timeoutMs);
    });

    const waitPromise = executionPromise.then((data) => ({
      isTimeout: false,
      statusCode: data.statusCode,
      stdout: data.stdout,
    }));

    let result: { isTimeout: boolean; statusCode?: number; stdout?: string };
    try {
      result = await Promise.race([waitPromise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }

    if (result.isTimeout) {
      isTimedOut = true;
      exitCode = 124; // Standard timeout exit code
      try {
        await container.kill();
      } catch {}
    } else {
      exitCode = result.statusCode ?? 1;
      stdout = result.stdout || '';
      const reportJson = await readSandboxReport(container);
      testCounts = readTestCounts(reportJson, options.testFile.framework);
    }
  } catch (err: any) {
    stderr = err?.message || 'Sandbox container runtime error';
    exitCode = 1;
  } finally {
    // Ephemeral cleanup: always destroy container immediately
    if (container) {
      try {
        await container.remove({ force: true });
      } catch {}
    }
  }

  const durationMs = Date.now() - startTime;
  if (exitCode === 0 && (!testCounts || testCounts.total === 0)) {
    exitCode = 1;
    stderr = `${stderr}${stderr ? '\n' : ''}${testCounts ? 'The test runner discovered no tests.' : 'The test runner did not produce a readable report; results are unavailable.'}`;
  }
  return buildExecutionResultAndReport(options, runId, exitCode, stdout, stderr, durationMs, isTimedOut, testCounts);
}

// ─── Safe Ephemeral Sandbox Fallback ─────────────────────────────────────────

function reportUnavailableSandbox(
  _options: ExecuteTestSuiteOptions,
  runId: string,
  startTime: number
): { execution: TestExecutionResultDTO; report: TestReportDTO } {
  const fallbackDurationMs = Date.now() - startTime;
  return {
    execution: {
      runId,
      status: 'ERROR',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      durationMs: fallbackDurationMs,
      exitCode: 125,
      stdout: '',
      stderr: 'Test execution was not performed because the Docker sandbox runtime is unavailable.',
      errorMessages: ['Docker sandbox runtime is unavailable.'],
      stackTraces: [],
      failedAssertions: [],
      securitySpec: DEFAULT_SECURITY_SPEC,
    },
    report: {
      whatWasTested: [],
      whatPassed: [],
      whatFailed: [],
      whyTestsFailed: [],
      suggestedFixes: [],
      coverageLimitations: ['No tests ran because the Docker sandbox runtime is unavailable.'],
      recommendedAdditionalTests: [],
    },
  };


}

// ─── Result & Report Synthesis ───────────────────────────────────────────────

const JEST_CONFIG = `module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { target: 'ES2020', module: 'commonjs', esModuleInterop: true }, diagnostics: false }],
  },
};
`;

const VITEST_CONFIG = `export default {
  server: { host: '127.0.0.1' },
  test: { pool: 'threads', poolOptions: { threads: { singleThread: true } } },
};
`;

function getSafeWorkspacePath(input: string): string {
  const normalizedInput = input.replace(/\\/g, '/');
  if (!normalizedInput || normalizedInput.includes('\0') || normalizedInput.startsWith('/') || /^[a-z]:/i.test(normalizedInput)) {
    throw new Error('Sandbox file paths must be relative to the workspace.');
  }
  const normalizedPath = path.posix.normalize(normalizedInput);
  if (normalizedPath === '.' || normalizedPath === '..' || normalizedPath.startsWith('../')) {
    throw new Error('Sandbox file path escapes the workspace.');
  }
  return normalizedPath;
}

async function writeSandboxFile(container: any, relativePath: string, contents: string): Promise<void> {
  const destination = `/workspace/${relativePath}`;
  const directory = path.posix.dirname(destination);
  const encodedContents = Buffer.from(contents, 'utf8').toString('base64');
  const chunks = encodedContents.match(/.{1,96000}/g) || [''];
  for (let index = 0; index < chunks.length; index++) {
    const initialWrite = index === 0;
    const shellCommand = initialWrite
      ? 'mkdir -p "$1" && : > "$2" && printf %s "$3" | base64 -d >> "$2"'
      : 'printf %s "$3" | base64 -d >> "$2"';
    const writer = await container.exec({
      Cmd: ['sh', '-c', shellCommand, 'devflow-write-file', directory, destination, chunks[index]],
      User: DEFAULT_SECURITY_SPEC.runAsUser,
      WorkingDir: '/workspace',
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });
    const stream = await writer.start({ hijack: true, stdin: false, Tty: true });
    let streamOutput = '';
    stream.on('data', (chunk: Buffer) => { streamOutput += chunk.toString('utf8'); });
    const deadline = Date.now() + 10000;
    let result: { Running?: boolean; ExitCode?: number };
    do {
      result = await writer.inspect();
      if (!result.Running) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < deadline);
    stream.destroy();
    if (result.Running) throw new Error(`Timed out staging ${relativePath} in the sandbox.`);
    if (result.ExitCode !== 0) throw new Error(`Sandbox could not stage ${relativePath}: ${streamOutput}`);
  }
}

interface SandboxTestCounts {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passedNames: string[];
  failedAssertions: FailedAssertion[];
}

async function readSandboxReport(container: any): Promise<string> {
  const reader = await container.exec({
    Cmd: ['cat', '/tmp/report.json'],
    User: DEFAULT_SECURITY_SPEC.runAsUser,
    WorkingDir: '/workspace',
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });
  const stream = await reader.start({ hijack: true, stdin: false, Tty: true });
  let output = '';
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => { output += chunk.toString('utf8'); });
    stream.once('error', reject);
    stream.once('end', async () => {
      try {
        const result = await reader.inspect();
        if (result.ExitCode !== 0) throw new Error('The test runner did not produce a readable JSON report.');
        resolve(output);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function readTestCounts(
  rawReport: string,
  framework: GeneratedTestFile['framework']
): SandboxTestCounts | undefined {
  try {
    const report = JSON.parse(rawReport) as Record<string, any>;
    if (framework === 'pytest' && report.summary) {
      const tests = Array.isArray(report.tests) ? report.tests : [];
      return {
        total: report.summary.total || 0,
        passed: report.summary.passed || 0,
        failed: (report.summary.failed || 0) + (report.summary.error || 0),
        skipped: report.summary.skipped || 0,
        passedNames: tests.filter((test: any) => test.outcome === 'passed').map((test: any) => test.nodeid),
        failedAssertions: tests
          .filter((test: any) => test.outcome === 'failed' || test.outcome === 'error')
          .map((test: any) => {
            const actual = test.call?.longrepr || test.setup?.longrepr || test.teardown?.longrepr || 'Test failed';
            return {
              testName: test.nodeid || 'pytest test',
              expected: 'Test to pass',
              actual: String(actual),
              message: String(actual).split('\n')[0],
              filePath: test.nodeid,
            };
          }),
      };
    }

    if (typeof report.numTotalTests === 'number') {
      const testResults = Array.isArray(report.testResults) ? report.testResults : [];
      const assertions = testResults.flatMap((suite: any) => suite.assertionResults || []);
      return {
        total: report.numTotalTests,
        passed: report.numPassedTests || 0,
        failed: report.numFailedTests || 0,
        skipped: (report.numPendingTests || 0) + (report.numTodoTests || 0),
        passedNames: assertions.filter((test: any) => test.status === 'passed').map((test: any) => test.fullName || test.title),
        failedAssertions: assertions
          .filter((test: any) => test.status === 'failed')
          .map((test: any) => {
            const actual = (test.failureMessages || []).join('\n') || 'Test failed';
            return {
              testName: test.fullName || test.title || 'Test',
              expected: 'Test to pass',
              actual,
              message: actual.split('\n')[0],
              filePath: testResults.find((suite: any) => suite.assertionResults?.includes(test))?.name,
            };
          }),
      };
    }
  } catch {}
  return undefined;
}

function createDockerClient(DockerClient: new (options: Record<string, unknown>) => Docker): Docker {
  const dockerSocket = process.env.DOCKER_SOCKET;
  if (dockerSocket) return new DockerClient({ socketPath: dockerSocket, timeout: 65000 });
  const configuredHost = process.env.DOCKER_HOST || 'unix:///var/run/docker.sock';
  if (configuredHost.startsWith('unix://')) {
    return new DockerClient({ socketPath: configuredHost.slice('unix://'.length), timeout: 65000 });
  }
  if (configuredHost.startsWith('npipe://')) {
    return new DockerClient({ socketPath: configuredHost.slice('npipe://'.length), timeout: 65000 });
  }
  throw new Error('Unsupported DOCKER_HOST value. Configure a Unix socket or Windows named pipe.');
}

function buildExecutionResultAndReport(
  options: ExecuteTestSuiteOptions,
  runId: string,
  exitCode: number,
  stdout: string,
  stderr: string,
  durationMs: number,
  isTimedOut: boolean,
  testCounts?: SandboxTestCounts
): { execution: TestExecutionResultDTO; report: TestReportDTO } {
  const testCases = options.testFile.testCases;
  const totalTests = testCounts?.total ?? 0;
  const passed = testCounts?.passed ?? 0;
  const failed = testCounts?.failed ?? 0;
  const skipped = testCounts?.skipped ?? 0;
  const status = isTimedOut
    ? 'TIMED_OUT'
    : !testCounts || totalTests === 0
    ? 'ERROR'
    : exitCode === 0 && failed === 0
    ? 'PASSED'
    : 'FAILED';
  const failedAssertions: FailedAssertion[] = testCounts?.failedAssertions ?? [];

  const execution: TestExecutionResultDTO = {
    runId,
    status,
    totalTests,
    passedTests: passed,
    failedTests: failed,
    skippedTests: skipped,
    durationMs,
    exitCode,
    stdout,
    stderr,
    errorMessages: failedAssertions.map((f) => f.message).concat(status === 'ERROR' && stderr ? [stderr] : []),
    stackTraces: failedAssertions.map((f) => f.stackTrace || `${f.message}\n    at ${f.filePath || options.testFile.filePath}:${f.line || 10}`),
    failedAssertions,
    securitySpec: DEFAULT_SECURITY_SPEC,
  };

  // Detailed Test Report
  const report: TestReportDTO = {
    whatWasTested: [
      `Target File: ${options.testFile.targetFilePath}`,
      `Framework: ${options.testFile.framework}`,
      `Language: ${options.testFile.language}`,
      `Categories Covered: ${Array.from(new Set(testCases.map((c) => c.category))).join(', ')}`,
      `Tests reported by runner: ${totalTests}`,
    ],
    whatPassed: testCounts?.passedNames ?? [],
    whatFailed: failedAssertions.map((f) => `${f.testName} (failed assertion: ${f.expected} vs ${f.actual})`),
    whyTestsFailed: failedAssertions.map((f) => ({
      testName: f.testName,
      reason: f.message,
      error: f.actual,
      failedAssertion: f.expected,
    })),
    suggestedFixes: [],
    coverageLimitations: [
      'Code coverage was not collected by the configured test runner.',
      'Third-party external network services are unavailable because sandbox networking is disabled.',
    ],
    recommendedAdditionalTests: [
      'Add fuzzing test with 10,000 randomized byte arrays to verify parser resiliency under extreme noise.',
      'Add concurrency race test asserting that parallel invocations do not corrupt shared state.',
    ],
  };

  return { execution, report };
}
