import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeClipboardItem, rtfToText } from "../src/rich-text.js";

const windowsOnly = { skip: process.platform !== "win32" };

test("Apple RTF formatting is removed and Turkish codepage escapes survive", windowsOnly, async () => {
  const rtf = String.raw`{\rtf1\ansi\ansicpg1252\cocoartf2870
{\fonttbl\f0\fnil\fcharset0 .SFUI-Regular;\f1\froman\fcharset0 TimesNewRomanPSMT;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;}
{\*\expandedcolortbl;;\cssrgb\c0\c0\c0;}
\deftab720\pard\pardeftab720\partightenfactor0
\f0\fs34 \cf0 \expnd0\expndtw0\kerning0
\outl0\strokewidth0 \strokec2 Sentetik test: T\'fcrk\'e7e metin ve \u287? harfi.
\f1 \strokec2 \par
}`;
  const result = await rtfToText(rtf);
  assert.equal(result.trimEnd(), "Sentetik test: Türkçe metin ve ğ harfi.");
});

test("RTF Unicode, emoji, line breaks, tabs and literal braces survive", windowsOnly, async () => {
  const rtf = String.raw`{\rtf1\ansi\uc1 \u287?\u351?\u305? \u-10179?\u-8704?\line ikinci\tab \{satir\}}`;
  assert.equal(await rtfToText(rtf), "ğşı 😀\nikinci\t{satir}");
});

test("ordinary text and binary documents are not converted", async () => {
  for (const item of [
    { type: "text", content: "Türkçe 😀 \\rtf1 örnek {metin}" },
    { type: "file", data: Buffer.from("%PDF-1.4"), filename: "belge.pdf" }
  ]) assert.equal(await normalizeClipboardItem(item), item);
});
