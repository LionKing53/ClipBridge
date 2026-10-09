import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createServer, readFormText } from "../src/app.js";
import { Readable } from 'node:stream';

const token = "test-token-that-is-at-least-32-characters";
const servers = [];

test("RTF reaches clipboard as plain text for every supported upload envelope", { skip: process.platform !== "win32" }, async () => {
  let received;
  const baseUrl = await startWithOptions({ setClipboardItem: async item => { received = item; return { type: item.type }; } });
  const rtf = String.raw`{\rtf1\ansi\ansicpg1252 ge\'e7ince \u287?\u351?}`;
  const cases = [];
  for (const mimeType of ["text/rtf", "application/rtf", "text/plain", "application/octet-stream"]) {
    const form = new FormData();
    form.set("content", new Blob([rtf], { type: mimeType }), "Pano.rtf");
    cases.push({ body: form });
    cases.push({ body: rtf, headers: { "Content-Type": mimeType } });
  }
  const form = new FormData();
  form.set("content", rtf);
  cases.push({ body: form });
  cases.push({ body: JSON.stringify({ type: "text", content: rtf }), headers: { "Content-Type": "application/json" } });
  for (const options of cases) {
    const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
      ...options, method: "POST", headers: { ...options.headers, Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { type: "text", content: "geçince ğş" });
  }
});

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise((resolve) => server.close(resolve))
    )
  );
});

async function start(setClipboard = async () => {}, getClipboard = async () => "") {
  const server = createServer({ token, setClipboard, getClipboard, logger: { info() {}, error() {} } });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

async function startWithOptions(options) {
  const server = createServer({ token, logger: { info() {}, error() {} }, ...options });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test("health endpoint kimlik dogrulama istemez", async () => {
  const baseUrl = await start();
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test("eslestirme sayfasi gizli anahtari sunucudan yayinlamaz", async () => {
  const baseUrl = await start();
  const response = await fetch(`${baseUrl}/setup`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(html.includes(token), false);
});

test("anahtarsiz pano istegini reddeder", async () => {
  const baseUrl = await start();
  const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
    method: "POST",
    body: JSON.stringify({ type: "text", content: "gizli" })
  });
  assert.equal(response.status, 401);
});

test("yetkili istemci Windows pano metnini okuyabilir", async () => {
  const expected = "Windows'tan iPhone'a: ıİ şŞ öÖ üÜ 👋";
  const baseUrl = await start(async () => {}, async () => expected);
  const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), expected);
});

test("yetkili metni Windows pano katmanina iletir", async () => {
  let received;
  const baseUrl = await start(async (text) => {
    received = text;
  });
  const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ type: "text", content: "Merhaba, dunya! 👋" })
  });
  assert.equal(response.status, 200);
  assert.equal(received, "Merhaba, dunya! 👋");
});

test("Form govdesindeki Turkce metni pano ogesi olarak alir", async () => {
  let received;
  const baseUrl = await startWithOptions({
    setClipboardItem: async (item) => {
      received = item;
      return { type: item.type };
    }
  });
  const form = new FormData();
  form.set("content", "Görüşürüz: ıİ şŞ üÜ");
  const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { type: "text", content: "Görüşürüz: ıİ şŞ üÜ" });
});

test('URL-encoded Shortcut form is text, preserving Unicode, spaces and encoded delimiters', async () => {
  let received;
  const baseUrl = await startWithOptions({ setClipboardItem: async item => { received = item; return { type: item.type }; } });
  for (const content of ['Görüşürüz ıİ şŞ üÜ 👋\nikinci satır + & = %', '', 'content=x&other=y']) {
    const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: new URLSearchParams({ content })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).type, 'text');
    assert.deepEqual(received, { type: 'text', content });
  }
});

test('URL-encoded form rejects malformed, ambiguous and unauthorized requests without clipboard writes', async () => {
  let writes = 0;
  const baseUrl = await startWithOptions({ setClipboardItem: async () => { writes++; } });
  for (const [body, status] of [['other=x', 422], ['content=a&content=b', 422], ['content=a&extra=b', 422], ['content=%ZZ', 400], ['content=%FF', 400], ['', 422]]) {
    const response = await fetch(`${baseUrl}/api/v1/clipboard`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }, body });
    assert.equal(response.status, status);
  }
  const denied = await fetch(`${baseUrl}/api/v1/clipboard`, { method: 'POST', body: new URLSearchParams({ content: 'secret' }) });
  assert.equal(denied.status, 401);
  assert.equal(writes, 0);
});

test('URL-encoded form reader enforces streaming byte limit and rejects invalid UTF-8', async () => {
  assert.deepEqual(await readFormText(Readable.from([Buffer.from('content=x')]), 9), { type: 'text', content: 'x' });
  await assert.rejects(readFormText(Readable.from([Buffer.from('content='), Buffer.from('xx')]), 9), { statusCode: 413 });
  await assert.rejects(readFormText(Readable.from([Buffer.from([0xff])])), { statusCode: 400 });
});

test("Form govdesindeki PNG dosyasini gorsel olarak algilar", async () => {
  let received;
  const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
  const baseUrl = await startWithOptions({
    setClipboardItem: async (item) => {
      received = item;
      return { type: item.type };
    }
  });
  const form = new FormData();
  form.set("content", new Blob([png], { type: "image/png" }), "fotoğraf.png");
  const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  assert.equal(response.status, 200);
  assert.equal(received.type, "image");
  assert.equal(received.mimeType, "image/png");
  assert.equal(received.filename, "fotoğraf.png");
  assert.deepEqual(received.data, png);
});

test("Form File alanindaki UTF-8 metni metin panosu olarak algilar", async () => {
  let received;
  const baseUrl = await startWithOptions({
    setClipboardItem: async (item) => {
      received = item;
      return { type: item.type };
    }
  });
  const form = new FormData();
  form.set("content", new Blob(["Türkçe metin: ğüşi"], { type: "text/plain" }), "Pano.txt");
  const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { type: "text", content: "Türkçe metin: ğüşi" });
});

test("Windows pano gorselini binary PNG yaniti olarak dondurur", async () => {
  const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
  const baseUrl = await startWithOptions({
    getClipboardItem: async () => ({
      type: "image",
      data: png,
      filename: "ClipBridge.png",
      mimeType: "image/png"
    })
  });
  const response = await fetch(`${baseUrl}/api/v1/clipboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-clipbridge-type"), "image");
  assert.equal(response.headers.get("x-panokopru-type"), "image");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
});

test("Windows pano turunu kestirme icin text, image veya file olarak bildirir", async () => {
  let item = { type: "text", content: "Merhaba" };
  const baseUrl = await startWithOptions({ getClipboardItem: async () => item });
  const headers = { Authorization: `Bearer ${token}` };

  let response = await fetch(`${baseUrl}/api/v1/clipboard/kind`, { headers });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "text");

  item = { type: "file", filename: "foto.jpeg", mimeType: "image/jpeg" };
  response = await fetch(`${baseUrl}/api/v1/clipboard/kind`, { headers });
  assert.equal(await response.text(), "image");

  item = { type: "file", filename: "belge.pdf", mimeType: "application/pdf" };
  response = await fetch(`${baseUrl}/api/v1/clipboard/kind`, { headers });
  assert.equal(await response.text(), "file");
});
