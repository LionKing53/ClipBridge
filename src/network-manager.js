import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedNetworks, matchesApprovedNetwork, networkKey, canTrust } from './network-policy.js';
import { assertProductionReady } from '../scripts/source-guard.js';

const run = promisify(execFile);
const fail = (message, statusCode = 409) => Object.assign(new Error(message), { statusCode });
export async function requestNetworkPermission(root, entry) {
  assertProductionReady();
  const requestId = randomUUID();
  const requestPath = path.join(root, `network-request-${requestId}.json`);
  const resultPath = path.join(root, `network-result-${requestId}.json`);
  await writeFile(requestPath, JSON.stringify({ entry, key: networkKey(entry), expiresAt: Date.now() + 180000 }), { flag: 'wx' });
  try {
    const script = fileURLToPath(new URL('../scripts/request-network-trust.ps1', import.meta.url));
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-RequestId', requestId], { windowsHide: true, timeout: 200000, maxBuffer: 16384 });
    const result = JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
    if (result.ok !== true) throw fail(result.cancelled ? 'Windows izni iptal edildi. Ağ güvenilen listeye eklenmedi.' : 'Windows ağ izni tamamlanamadı. Ağın bağlı olduğunu kontrol edip tekrar dene.');
  } catch (error) {
    if (error.statusCode) throw error;
    throw fail('Windows onayı tamamlanamadı veya zaman aşımına uğradı. Ağ listeye eklenmedi.');
  } finally {
    // Only this operation's narrowly named temporary metadata files; never secrets or user files.
    await unlink(requestPath).catch(() => {});
    await unlink(resultPath).catch(() => {});
  }
}

export async function createNetworkManager({ root, networkReader, permissionRunner = requestNetworkPermission, onChange = () => {} }) {
  const configPath = path.join(root, 'config.json');
  let config = JSON.parse(await readFile(configPath, 'utf8'));
  let operation = null;
  async function save(entries) {
    const next = { ...config, trustedNetworks: entries };
    const temporary = configPath + '.next';
    await writeFile(temporary, JSON.stringify(next, null, 2));
    await rename(temporary, configPath);
    config = next;
    onChange();
  }
  function acquire(action, key) {
    if (operation) throw fail('Başka bir ağ işlemi sürüyor. Tamamlanmasını bekle.');
    if (typeof key !== 'string' || !/^[a-f0-9]{32}$/.test(key)) throw fail('Geçersiz ağ seçimi.', 400);
    operation = { action, key };
  }
  return {
    config: () => config,
    operation: () => operation,
    async inspect() {
      const connected = (await networkReader()).filter(canTrust);
      return {
        connected: connected.map(net => ({ key: networkKey(net), name: net.name, interfaceAlias: net.interfaceAlias, category: net.category, address: net.address,
          trusted: approvedNetworks(config).some(entry => matchesApprovedNetwork(entry, net)) })),
        operation
      };
    },
    async trust(key) {
      acquire('trust', key);
      try {
        const entry = (await networkReader()).find(net => canTrust(net) && networkKey(net) === key);
        if (!entry) throw fail('Seçilen ağ artık bağlı değil. Ağ listesini yenile.');
        if (approvedNetworks(config).length >= 30 && !approvedNetworks(config).some(net => networkKey(net) === key)) throw fail('En fazla 30 ağ kaydedilebilir. Kullanmadığın bir ağı çıkar.');
        // No name, address or shell arguments are accepted from the browser.
        const existing = approvedNetworks(config).find(net => networkKey(net) === key);
        const saved = { id: entry.id, name: entry.name, interfaceAlias: entry.interfaceAlias, interfaceDescription: entry.interfaceDescription, previousCategory: existing?.previousCategory || entry.category };
        await permissionRunner(root, saved);
        const current = (await networkReader()).find(net => canTrust(net) && matchesApprovedNetwork(saved, net) && net.category === 'Private');
        if (!current) throw fail('Onay sırasında ağ değişti. Güven kaydedilmedi; yeni bağlantıyı tekrar seç.');
        saved.permissionGranted = true;
        const entries = approvedNetworks(config).filter(net => networkKey(net) !== key);
        const oldIndex = approvedNetworks(config).findIndex(net => networkKey(net) === key);
        entries.splice(oldIndex < 0 ? entries.length : oldIndex, 0, saved);
        await save(entries);
        return { ok: true, message: 'Ağ güvenilen listeye eklendi. Yerel bağlantı birkaç saniye içinde hazırlanacak.' };
      } finally { operation = null; }
    },
    async remove(key) {
      acquire('remove', key);
      try {
        const entries = approvedNetworks(config);
        if (!entries.some(net => networkKey(net) === key)) throw fail('Bu ağ zaten listede değil.', 404);
        // Revoke application access immediately, without requiring UAC or a connected adapter.
        await save(entries.filter(net => networkKey(net) !== key));
        return { ok: true, message: 'Ağ güvenilen listeden çıkarıldı. Bu ağdaki yerel erişim kapatıldı. Windows ağ profili ve Tailscale değiştirilmedi.' };
      } finally { operation = null; }
    }
  };
}
