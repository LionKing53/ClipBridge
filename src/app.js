import { timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import https from 'node:https';
import { pipeline } from "node:stream/promises";
import { isRtf, isFlatRtfd, normalizeClipboardItem } from "./rich-text.js";
import { MAX_FILE_BYTES, MAX_TEXT_BYTES, UploadStorage, readMultipartUpload, readBinaryUpload } from "./uploads.js";
import { publicFailure } from './errors.js';
import { disposeTransfer } from './owned-outbox.js';
import { manageRequests } from './managed-http.js';
import { translate } from './i18n.js';

export const MAX_BODY_BYTES = MAX_FILE_BYTES;

function json(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)
  });
  response.end(payload);
}

function text(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function contentDisposition(type, filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function clipboardKind(item) {
  if (item.type === "text") return "text";
  if (item.type === "image" || item.mimeType?.startsWith("image/")) return "image";
  return "file";
}

async function sendClipboardItem(response, item, onSent) {
  if (item.type === "text") {
    text(response, 200, item.content);
    await onSent(item).catch(() => {});
    return;
  }

  const filename = item.filename || (item.type === "image" ? "ClipBridge.png" : "ClipBridge-dosya");
  const mimeType = item.mimeType || (item.type === "image" ? "image/png" : "application/octet-stream");
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": mimeType,
    "Content-Disposition": contentDisposition(item.type === "image" ? "inline" : "attachment", filename),
    "X-ClipBridge-Type": item.type,
    "X-PanoKopru-Type": item.type // Existing Shortcuts clients retain their protocol.
  };

  if (item.path) {
    try {
      const info = await stat(item.path);
      response.writeHead(200, { ...headers, "Content-Length": info.size });
      await pipeline(createReadStream(item.path), response);
      await onSent(item).catch(() => {});
    } finally {
      await disposeTransfer(item).catch(() => {});
    }
    return;
  }

  response.writeHead(200, { ...headers, "Content-Length": item.data.length });
  response.end(item.data);
  await onSent(item).catch(() => {});
}

function setupPage(response, language) {
  const t = key => translate(key, language);
  const html = `<!doctype html>
<html lang="${language}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('m_4d979b193d8e')}</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0 auto; max-width: 42rem; padding: 2rem 1.25rem; line-height: 1.5; }
  .card { border: 1px solid #8886; border-radius: 16px; padding: 1rem; margin: 1rem 0; }
  code { word-break: break-all; }
  button { font: inherit; padding: .7rem 1rem; border-radius: 10px; border: 1px solid #8888; }
  .ok { color: #159447; }
</style>
<h1>${t('m_58e60cedcfe8')}</h1>
<p>${t('m_b4880350519c')}</p>
<div class="card"><strong>${t('m_dce57d76b5e7')}</strong><p><code id="endpoint"></code></p><button data-copy="endpoint">${t('m_eaaeb026a8ef')}</button></div>
<div class="card"><strong>${t('m_cc255866a656')}</strong><p><code id="authorization"></code></p><button data-copy="authorization">${t('m_ab2a77840124')}</button></div>
<p id="status"></p>
<script>
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("token") || "";
  history.replaceState(null, "", location.pathname);
  const endpoint = location.origin + "/api/v1/clipboard";
  document.querySelector("#endpoint").textContent = endpoint;
  document.querySelector("#authorization").textContent = token ? "Bearer " + token : ${JSON.stringify(t('m_c7151af3977d'))};
  document.querySelectorAll("button").forEach((button) => button.addEventListener("click", async () => {
    const value = document.querySelector("#" + button.dataset.copy).textContent;
    await navigator.clipboard.writeText(value);
    const status = document.querySelector("#status");
    status.textContent = ${JSON.stringify(t('m_bfd4ea44793b'))};
    status.className = "ok";
  }));
</script>
</html>`;

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html)
  });
  response.end(html);
}

function isAuthorized(request, expectedToken) {
  const prefix = "Bearer ";
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith(prefix)) {
    return false;
  }

  const actual = Buffer.from(header.slice(prefix.length), "utf8");
  const expected = Buffer.from(expectedToken, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_TEXT_BYTES) {
      const error = new Error("Istek govdesi cok buyuk.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Gecersiz JSON.");
    error.statusCode = 400;
    throw error;
  }
}


export async function readFormText(request, maxBytes = MAX_TEXT_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      throw Object.assign(new Error('Form metni boyut sinirini asiyor.'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  let fields;
  try {
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    fields = raw.split('&').map(field => {
      const separator = field.indexOf('=');
      const decode = value => decodeURIComponent(value.replace(/\+/g, ' '));
      return [decode(separator < 0 ? field : field.slice(0, separator)), decode(separator < 0 ? '' : field.slice(separator + 1))];
    });
  } catch {
    throw Object.assign(new Error('Gecersiz UTF-8 form metni.'), { statusCode: 400 });
  }
  if (fields.length !== 1 || fields[0][0] !== 'content') {
    throw Object.assign(new Error('Form tek bir content alani icermeli.'), { statusCode: 422 });
  }
  return { type: 'text', content: fields[0][1] };
}

async function readClipboardItem(request, storage) {
  const contentType = request.headers["content-type"] || "application/octet-stream";
  if (contentType.split(';', 1)[0].trim().toLowerCase() === 'application/x-www-form-urlencoded') {
    return readFormText(request);
  }
  if (contentType.startsWith("application/json")) {
    const body = await readJson(request);
    if (body?.type !== "text" || typeof body.content !== "string") {
      const error = new Error("JSON, type=text ve string content icermeli.");
      error.statusCode = 422;
      throw error;
    }
    return { type: "text", content: body.content };
  }
  if (contentType.startsWith("multipart/form-data")) {
    return readMultipartUpload(request, storage);
  }

  return readBinaryUpload(request, storage);
}

export function createServer({
  token,
  getLanguage = () => 'tr',
  setClipboard,
  getClipboard = async () => "",
  setClipboardItem,
  getClipboardItem,
  onTransferEvent = () => {},
  onClipboardSent = async () => {},
  instanceId,
  tls,
  transportGuard = () => true,
  handleExtraRequest = async () => false,
  maxUploadBytes = MAX_FILE_BYTES,
  uploadOptions,
  logger = console
}) {
  const receiveItem = setClipboardItem || (async (item) => {
    if (item.type !== "text") throw new Error("Bu sunucu yalnizca metin destekliyor.");
    await setClipboard(item.content);
    return { type: "text" };
  });
  const provideItem = getClipboardItem || (async () => ({ type: "text", content: await getClipboard() }));

  const listener = async (request, response) => {
    if (!transportGuard(request)) { json(response, 403, { ok: false, error: 'network_not_allowed' }); return; }
    try { if (await handleExtraRequest(request, response)) return; }
    catch { if (!response.headersSent) json(response, 500, { ok: false, error: 'setup_unavailable' }); return; }
    const url = new URL(request.url, "http://clipboard-bridge.local");

    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { ok: true, service: "clipboard-bridge", version: 1, ...(instanceId ? { instanceId } : {}) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/setup") {
      setupPage(response, getLanguage());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/clipboard/kind") {
      if (!isAuthorized(request, token)) {
        json(response, 401, { ok: false, error: "unauthorized" });
        return;
      }

      let item;
      try {
        item = await provideItem();
        text(response, 200, clipboardKind(item));
      } catch (error) {
        logger.error("clipboard_kind_failed");
        const failure = publicFailure(error, 'clipboard_read_failed', getLanguage());
        json(response, failure.status, failure.body);
      } finally {
        await disposeTransfer(item).catch(() => {});
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/clipboard") {
      if (!isAuthorized(request, token)) {
        json(response, 401, { ok: false, error: "unauthorized" });
        return;
      }

      try {
        const item = await provideItem();
        const size = item.data?.length || (item.content ? Buffer.byteLength(item.content, "utf8") : 0);
        logger.info(`[clipboard] Windows'tan ${item.type} (${size} bayt) okundu.`);
        await sendClipboardItem(response, item, onClipboardSent);
      } catch (error) {
        logger.error("clipboard_read_failed");
        const failure = publicFailure(error, 'clipboard_read_failed', getLanguage());
        if (!response.headersSent) json(response, failure.status, failure.body);
      }
      return;
    }

    if (request.method !== "POST" || url.pathname !== "/api/v1/clipboard") {
      json(response, 404, { ok: false, error: "not_found" });
      return;
    }

    // Diagnostics contain only transfer metadata, never body, filenames or credentials.
    const event = {
      startedAt: new Date().toISOString(),
      requestMime: (request.headers["content-type"] || "").split(";", 1)[0].slice(0, 100),
      stage: "received"
    };
    function report() {
      try { onTransferEvent({ ...event }); } catch { /* diagnostics must not break transfers */ }
    }
    report();

    if (!isAuthorized(request, token)) {
      event.stage = "unauthorized";
      event.errorCode = 'unauthorized';
      event.status = 401;
      report();
      json(response, 401, { ok: false, error: "unauthorized" });
      return;
    }

    const storage = new UploadStorage(maxUploadBytes, uploadOptions);
    try {
      event.stage = "reading";
      report();
      const received = await readClipboardItem(request, storage);
      const value = received.type === "text" ? received.content : (received.data || received.prefix);
      event.inputType = received.type;
      event.inputMime = received.mimeType;
      event.bytes = received.size ?? (typeof value === "string" ? Buffer.byteLength(value) : value?.length);
      event.rtf = value != null && isRtf(value);
      event.rtfd = isFlatRtfd(value);
      event.stage = "normalizing";
      report();
      const item = await normalizeClipboardItem(received);
      event.outputType = item.type;
      event.stage = "writing_clipboard";
      report();
      const result = await receiveItem(item);
      const size = item.size ?? (item.data?.length || (item.content ? Buffer.byteLength(item.content, "utf8") : 0));
      logger.info(`[clipboard] ${item.type} (${size} bayt) alindi.`);
      event.stage = "completed";
      event.status = 200;
      report();
      json(response, 200, { ok: true, ...result });
    } catch (error) {
      const failure = publicFailure(error, 'clipboard_update_failed', getLanguage());
      const statusCode = failure.status;
      event.failedStage = event.stage;
      event.stage = "failed";
      event.status = statusCode;
      event.errorCode = failure.body.error;
      report();
      if (statusCode === 500) {
        logger.error("clipboard_update_failed");
      }
      if (!response.headersSent && !response.destroyed) json(response, statusCode, failure.body);
    } finally {
      await storage.cleanup().catch(() => logger.error("Gecici aktarim dosyasi temizlenemedi."));
    }
  };
  return manageRequests(tls ? https.createServer(tls) : http.createServer(), listener);
}
