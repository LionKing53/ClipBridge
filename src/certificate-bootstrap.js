import http from 'node:http';
import { randomBytes, X509Certificate } from 'node:crypto';
import { assertRuntimeContext } from './runtime-context.js';
import { isPrivateIPv4 } from './local-network.js';
import { assertProductionReady } from '../scripts/source-guard.js';

// Deliberately PUBLIC CERTIFICATE ONLY over HTTP before TLS trust exists.
// No clipboard endpoints, credentials, private keys, directory reads or redirects.
// The user must compare the certificate on the phone with the desktop fingerprint.
export async function startCertificateBootstrap({ context, certificate, address, isAllowed, ttlMs = 120000, now = () => Date.now(), port = context.ports.local }) {
  assertRuntimeContext(context);
  if (context.mode === 'production') { assertProductionReady(); if (!isPrivateIPv4(address)) throw new Error('Approved private IPv4 address required.'); }
  else if (address !== '127.0.0.1') throw new Error('Isolated bootstrap must bind loopback.');
  if (typeof isAllowed !== 'function' || !Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > 300000) throw new Error('Explicit access guard and bounded expiry required.');
  const ca = new X509Certificate(certificate);
  if (!ca.ca || !ca.checkIssued(ca) || !ca.verify(ca.publicKey)) throw new Error('Expected self-signed public CA certificate.');
  if (now() < Date.parse(ca.validFrom) || now() >= Date.parse(ca.validTo)) throw new Error('Public CA certificate is not currently valid.');
  const route = '/certificate/' + randomBytes(24).toString('hex') + '.cer';
  const expiresAt = now() + ttlMs; let downloads = 0, closed = false;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      if (closed || now() >= expiresAt || downloads >= 16) { res.writeHead(410); res.end(); return; }
      if (req.headers.host !== `${address}:${server.address().port}` || req.headers.origin || !await isAllowed(req)) { res.writeHead(403); res.end(); return; }
      if (req.method !== 'GET' || req.url !== route) { res.writeHead(404); res.end(); return; }
      downloads++;
      res.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert', 'Content-Disposition': 'attachment; filename="PanoKopru-Local-CA.cer"', 'Content-Length': ca.raw.length });
      res.end(ca.raw);
    } catch { if (!res.headersSent) res.writeHead(403); res.end(); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, address, resolve); });
  let timer;
  const close = async () => { if (closed) return; closed = true; clearTimeout(timer); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); };
  timer = setTimeout(() => { void close(); }, ttlMs); timer.unref();
  return { url: `http://${address}:${server.address().port}${route}`, fingerprint: ca.fingerprint256, expiresAt, close };
}
