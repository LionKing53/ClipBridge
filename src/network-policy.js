import { createHash } from 'node:crypto';
import { isIPv4 } from 'node:net';

export function approvedNetworks(config) {
  return Array.isArray(config.trustedNetworks) ? config.trustedNetworks : [config.home, ...(config.additionalNetworks ?? [])].filter(Boolean);
}
export function matchesApprovedNetwork(approved, net) {
  return typeof net.id === 'string' && net.id.toLowerCase() === approved.id.toLowerCase() && net.name === approved.name
    && (!approved.interfaceAlias || net.interfaceAlias === approved.interfaceAlias)
    && (!approved.interfaceDescription || net.interfaceDescription === approved.interfaceDescription);
}
export function networkKey(net) {
  return createHash('sha256').update(JSON.stringify([net.id.toLowerCase(), net.name, net.interfaceAlias])).digest('hex').slice(0, 32);
}
export function canTrust(net) {
  if (!net || !/^\{[a-f0-9-]{36}\}$/i.test(net.id) || typeof net.name !== 'string' || !net.name || net.name.length > 256
    || typeof net.interfaceAlias !== 'string' || !net.interfaceAlias || /[\x00-\x1f*?\[\]]/.test(net.interfaceAlias)
    || !isIPv4(net.address) || !['Public', 'Private'].includes(net.category)) return false;
  const [a, b] = net.address.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
