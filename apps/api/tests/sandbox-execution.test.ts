import { GeneratedTestFile } from '@devflow/shared';
import { TestGeneratorService } from '../src/services/testGeneratorService';
import { executeTestInSandbox } from '../src/services/testExecutionService';

export async function runSandboxExecutionTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  try {
    const previousSocket = process.env.DOCKER_SOCKET;
    process.env.DOCKER_SOCKET = '/devflow-test-invalid-docker-socket';
    try {
      const testFile: GeneratedTestFile = {
        fileName: 'billing.spec.ts',
        filePath: 'tests/billing.spec.ts',
        targetFilePath: 'src/billing.ts',
        language: 'typescript',
        framework: 'vitest',
        testCases: [],
        fullCode: '',
      };
      const { execution } = await executeTestInSandbox({
        repositoryId: 'sandbox-test',
        commitSha: 'test',
        testFile,
        sourceCode: 'export const billing = () => true;',
      });

      if (
        execution.status !== 'ERROR' ||
        execution.passedTests !== 0 ||
        execution.failedTests !== 0 ||
        execution.coverage !== undefined
      ) {
        throw new Error('Unavailable Docker runtime must report no execution results or fabricated coverage.');
      }
      results.push({ name: 'Sandbox execution: unavailable Docker reports ERROR without fabricated passes', passed: true });
    } finally {
      if (previousSocket === undefined) delete process.env.DOCKER_SOCKET;
      else process.env.DOCKER_SOCKET = previousSocket;
    }
  } catch (err: any) {
    results.push({ name: 'Sandbox execution: unavailable Docker reports ERROR without fabricated passes', passed: false, error: err.message });
  }

  try {
    const source = 'export function calculateTotal(amount: number) { return amount; }';
    const vitestFile = TestGeneratorService.generateTestsForFile('src/services/billing.ts', source, 'typescript', {
      targetFramework: 'vitest',
      selectedCategories: ['NORMAL'],
    });
    const jestFile = TestGeneratorService.generateTestsForFile('src/services/billing.ts', source, 'typescript', {
      targetFramework: 'jest',
      selectedCategories: ['NORMAL'],
    });
    const pythonFile = TestGeneratorService.generateTestsForFile('src/services/billing.py', 'def calculate_total(amount):\n    return amount\n', 'python', {
      targetFramework: 'pytest',
      selectedCategories: ['NORMAL'],
    });

    if (!vitestFile.fullCode.includes("from '../src/services/billing'")) {
      throw new Error('Vitest import path does not resolve from the tests directory.');
    }
    if (!jestFile.fullCode.includes("from '@jest/globals'")) {
      throw new Error('Jest generated tests do not import Jest globals.');
    }
    if (!pythonFile.fullCode.includes('from src.services.billing import')) {
      throw new Error('Pytest import path does not resolve from the sandbox workspace.');
    }
    results.push({ name: 'Sandbox execution: generated imports resolve for Vitest, Jest, and Pytest', passed: true });
  } catch (err: any) {
    results.push({ name: 'Sandbox execution: generated imports resolve for Vitest, Jest, and Pytest', passed: false, error: err.message });
  }

  return results;
}
