import assert from "node:assert/strict";
import { test } from "node:test";
import { extractFlatRtfdText, normalizeClipboardItem } from "../src/rich-text.js";
import { createServer } from "../src/app.js";

function uint32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

// Same directory/block layout as the captured iOS Messages transfer,
// using synthetic text only. No personal message is stored in fixtures.
function flatRtfd(rtf, attachment = false) {
  const entries = [
    ["TXT.rtf", Buffer.from(rtf)],
    [".", Buffer.from([1, 0, 0, 0])]
  ];
  if (attachment) entries.push(["photo.png", Buffer.from("image")]);
  const blocks = entries.map(([, data]) => Buffer.concat([uint32(1), uint32(data.length), data]));
  return Buffer.concat([
    Buffer.from("rtfd"), uint32(0), uint32(3), uint32(entries.length),
    ...entries.flatMap(([name]) => [uint32(Buffer.byteLength(name)), Buffer.from(name)]),
    ...blocks.map(b => uint32(b.length)), ...blocks
  ]);
}

const sample = String.raw`{\rtf1\ansi\ansicpg1252 ge\'e7ince \u287?\u351?}`;

test("flat RTFD extracts exactly the TXT.rtf block, excluding metadata", () => {
  assert.deepEqual(extractFlatRtfdText(flatRtfd(sample)), Buffer.from(sample));
});

test("flat RTFD validates bounds and leaves packages with attachments intact", async () => {
  const valid = flatRtfd(sample);
  for (let length = 4; length < valid.length; length++) {
    assert.throws(() => extractFlatRtfdText(valid.subarray(0, length)));
  }
  const corrupt = Buffer.from(valid);
  corrupt.writeUInt32LE(0xffffffff, 16);
  assert.throws(() => extractFlatRtfdText(corrupt));
  const item = { type: "file", data: flatRtfd(sample, true), mimeType: "application/octet-stream" };
  assert.equal(await normalizeClipboardItem(item), item);
});

test("Messages octet-stream and mislabeled text RTFD uploads become plain text", { skip: process.platform !== "win32" }, async () => {
  let received;
  const server = createServer({
    token: "synthetic-test-token", logger: { info() {}, error() {} },
    setClipboardItem: async item => { received = item; return { type: item.type }; }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    for (const type of ["application/octet-stream", "text/plain", "application/rtfd"]) {
      const form = new FormData();
      form.set("content", new Blob([flatRtfd(sample)], { type }), "Clipboard 16.01");
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/clipboard`, {
        method: "POST", headers: { Authorization: "Bearer synthetic-test-token" }, body: form
      });
      assert.equal(response.status, 200);
      assert.deepEqual(received, { type: "text", content: "geçince ğş" });
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
