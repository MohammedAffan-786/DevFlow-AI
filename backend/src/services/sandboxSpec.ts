export interface SandboxSecuritySpec {
  runAsUser: string;
  networkMode: string;
  cpuLimit: number;
  memoryLimitMb: number;
  timeoutSeconds: number;
  pidsLimit: number;
  readonlyRootfs: boolean;
  tmpfsMounts: string[];
  droppedCapabilities: string[];
  seccompProfileApplied: boolean;
  noNewPrivileges: boolean;
  isolationEngine: string;
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
