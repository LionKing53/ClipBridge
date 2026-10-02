// Synthetic OS boundary: no real machine/Tailscale/Explorer/clipboard access.
export const fixtureMachine = 'DEMO-PC';
export function createTestSystem(overrides = {}) {
  const denied = async () => { throw new Error('Unexpected OS action in isolated test'); };
  return {
    hostname: () => fixtureMachine,
    network: async () => ({ connected: true, dnsName: 'demo.example.invalid', ip: '100.64.0.10' }),
    copyText: denied, copyFiles: denied, copyImageAndFile: denied, reveal: denied,
    ...overrides
  };
}
