import assert from "node:assert/strict";
import { test } from "node:test";

test("Turkce ve emoji UTF-8 -> Base64 -> UTF-8 gecisinde korunur", () => {
  const original = "Görüşürüm; ıİ şŞ çÇ öÖ üÜ ğĞ — 👋";
  const encoded = Buffer.from(original, "utf8").toString("base64");
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  assert.equal(decoded, original);
});
