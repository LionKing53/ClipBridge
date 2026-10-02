import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { setTimeout } from "node:timers/promises";
import { createServer, MAX_BODY_BYTES } from "../src/app.js";
import { UploadStorage } from "../src/uploads.js";

const headers = { Authorization: "Bearer upload-test" };
async function withServer(options, run) {
  const server = createServer({ token: "upload-test", logger: { info() {}, error() {} }, ...options });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}/api/v1/clipboard`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test("raw and multipart uploads stream 65 MiB, preserve bytes, and clean staging files", async () => {
  assert.equal(MAX_BODY_BYTES, 512 * 1024 * 1024);
  const slab = Buffer.alloc(1024 * 1024, 0x61);
  const expected = createHash("sha256");
  for (let i = 0; i < 65; i++) expected.update(slab);
  const expectedHash = expected.digest("hex");
  let staged;
  await withServer({ setClipboardItem: async item => {
    assert.equal(item.type, "file");
    assert.equal(item.size, 65 * 1024 * 1024);
    assert.equal(item.data, undefined, "large files must not be held in a Buffer");
    staged = item.path;
    const actual = createHash("sha256");
    for await (const chunk of createReadStream(item.path)) actual.update(chunk);
    assert.equal(actual.digest("hex"), expectedHash);
    return { type: item.type };
  } }, async endpoint => {
    for (const multipart of [false, true]) {
      async function* body() {
        if (multipart) yield Buffer.from('--large-upload\r\nContent-Disposition: form-data; name="content"; filename="video.mp4"\r\nContent-Type: video/mp4\r\n\r\n');
        for (let i = 0; i < 65; i++) yield slab;
        if (multipart) yield Buffer.from('\r\n--large-upload--\r\n');
      }
      const response = await fetch(endpoint, {
        method: "POST", duplex: "half", body: Readable.from(body()),
        headers: { ...headers, "Content-Type": multipart ? "multipart/form-data; boundary=large-upload" : "video/mp4" }
      });
      assert.equal(response.status, 200);
      await response.json();
      for (let i = 0; i < 40 && await stat(staged).catch(() => null); i++) await setTimeout(25);
      assert.equal(await stat(staged).catch(() => null), null);
    }
  });
});

test("exact file limit is accepted; limit+1 is rejected for raw and multipart", async () => {
  let writes = 0;
  await withServer({ maxUploadBytes: 512, setClipboardItem: async item => { writes++; return { type: item.type }; } }, async endpoint => {
    for (const multipart of [false, true]) {
      for (const length of [512, 513]) {
        let body = Buffer.alloc(length);
        const requestHeaders = { ...headers };
        if (multipart) {
          body = new FormData();
          body.set("content", new Blob([Buffer.alloc(length)], { type: "video/mp4" }), "video.mp4");
        } else requestHeaders["Content-Type"] = "video/mp4";
        const response = await fetch(endpoint, { method: "POST", headers: requestHeaders, body });
        assert.equal(response.status, length === 512 ? 200 : 413);
        await response.json();
      }
    }
    assert.equal(writes, 2, "oversized data must never reach the clipboard writer");
  });
});

test("interrupted upload staging is removable and incomplete forms fail", async () => {
  const storage = new UploadStorage();
  async function* interrupted() {
    yield Buffer.alloc(2 * 1024 * 1024);
    throw new Error("connection closed");
  }
  try {
    await assert.rejects(storage.consume(Readable.from(interrupted())), /connection closed/);
    assert.ok(storage.directory);
  } finally { await storage.cleanup(); }
  assert.equal(await stat(storage.directory).catch(() => null), null);
  await withServer({ setClipboardItem: async () => { throw new Error("must not write incomplete uploads"); } }, async endpoint => {
    const response = await fetch(endpoint, {
      method: "POST", headers: { ...headers, "Content-Type": "multipart/form-data; boundary=incomplete" },
      body: '--incomplete\r\nContent-Disposition: form-data; name="content"; filename="video.mp4"\r\n\r\ntruncated'
    });
    assert.equal(response.status, 400);
    await response.json();
  });
});
