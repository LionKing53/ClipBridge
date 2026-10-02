import { mkdtemp, open, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Busboy from "busboy";
import mime from "mime-types";
import { isRtf, isFlatRtfd } from "./rich-text.js";

export const MAX_FILE_BYTES = 512 * 1024 * 1024;
export const MAX_TEXT_BYTES = 64 * 1024 * 1024;
const MEMORY_THRESHOLD = 1024 * 1024;

function uploadError(message, statusCode = 413) {
  return Object.assign(new Error(message), { statusCode });
}

export class UploadStorage {
  constructor(maxBytes = MAX_FILE_BYTES) {
    this.maxBytes = maxBytes;
    this.directory = null;
  }

  async consume(stream) {
    let size = 0;
    let prefix = Buffer.alloc(0);
    let chunks = [];
    let handle;
    let filePath;
    let overflow = false;
    try {
      for await (const chunk of stream) {
        size += chunk.length;
        if (size > this.maxBytes) {
          overflow = true;
          // Drain the remaining request so a useful HTTP 413 can be returned.
          continue;
        }
        if (prefix.length < 128) {
          prefix = Buffer.concat([prefix, chunk.subarray(0, 128 - prefix.length)]);
        }
        if (!handle && size > MEMORY_THRESHOLD) {
          this.directory = await mkdtemp(path.join(os.tmpdir(), "PanoKopru-upload-"));
          filePath = path.join(this.directory, "payload");
          handle = await open(filePath, "wx");
          for (const previous of chunks) await handle.writeFile(previous);
          chunks = [];
        }
        if (handle) await handle.writeFile(chunk);
        else chunks.push(chunk);
      }
    } finally {
      await handle?.close();
    }
    if (overflow) throw uploadError(`Dosya ${this.maxBytes} bayt sinirini asiyor.`);
    return filePath
      ? { path: filePath, size, prefix }
      : { data: Buffer.concat(chunks), size, prefix };
  }

  async cleanup() {
    // Only the unique directory created by this upload is ever removed.
    if (this.directory) await rm(this.directory, { recursive: true, force: true });
  }
}

async function classify(payload, mimeType, filename) {
  const rich = isRtf(payload.prefix) || isFlatRtfd(payload.prefix);
  const text = mimeType.startsWith("text/");
  const image = mimeType.startsWith("image/");
  if (rich || text || image) {
    if (payload.size > MAX_TEXT_BYTES) {
      throw uploadError("Metin ve pano gorselleri icin sinir 64 MiB; belge ve videolar icin 512 MiB.");
    }
    const data = payload.data || await readFile(payload.path);
    if (text && !rich) return { type: "text", content: data.toString("utf8") };
    return { type: rich ? "file" : "image", data, size: payload.size, mimeType, filename };
  }
  return { type: "file", ...payload, mimeType, filename };
}

function fallbackFilename(mimeType) {
  return `PanoKopru.${mime.extension(mimeType) || "bin"}`;
}

export async function readBinaryUpload(request, storage) {
  const mimeType = (request.headers["content-type"] || "application/octet-stream").split(";", 1)[0].trim().toLowerCase();
  if (Number(request.headers["content-length"]) > storage.maxBytes) {
    request.resume();
    throw uploadError(`Dosya ${storage.maxBytes} bayt sinirini asiyor.`);
  }
  const payload = await storage.consume(request);
  return classify(payload, mimeType, request.headers["x-panokopru-filename"] || fallbackFilename(mimeType));
}

export function readMultipartUpload(request, storage) {
  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({
        headers: request.headers, defParamCharset: "utf8",
        // The extra byte allows exactly maxBytes, while reliably rejecting maxBytes+1.
        limits: { files: 1, fileSize: storage.maxBytes + 1, fieldSize: MAX_TEXT_BYTES, fields: 1, parts: 2 }
      });
    } catch {
      reject(uploadError("Gecersiz multipart form.", 400));
      return;
    }
    let content;
    let fileTask;
    let file;
    let failure;
    let activeStream;
    const aborted = () => parser.destroy(uploadError("Aktarim yarida kesildi.", 400));
    request.once("aborted", aborted);
    parser.on("field", (name, value, info) => {
      if (info.valueTruncated) failure = uploadError("Metin 64 MiB sinirini asiyor.");
      if (name === "content") content = value;
      else failure = uploadError("Form alani content olmali.", 422);
    });
    parser.on("file", (name, stream, info) => {
      activeStream = stream;
      stream.on("error", () => {});
      if (name !== "content") {
        failure = uploadError("Form dosya alani content olmali.", 422);
        stream.resume();
        return;
      }
      stream.on("limit", () => { failure = uploadError(`Dosya ${storage.maxBytes} bayt sinirini asiyor.`); });
      fileTask = storage.consume(stream).then(async payload => {
        if (failure) return;
        const mimeType = info.mimeType || "application/octet-stream";
        file = await classify(payload, mimeType, info.filename || fallbackFilename(mimeType));
      }).catch(error => { failure = failure || error; });
    });
    parser.on("filesLimit", () => { failure = uploadError("Tek aktarimda yalnizca bir dosya destekleniyor.", 422); });
    parser.on("fieldsLimit", () => { failure = uploadError("Tek content alani destekleniyor.", 422); });
    parser.on("partsLimit", () => { failure = uploadError("Formda cok fazla alan var.", 422); });
    parser.on("error", error => {
      if (!failure?.statusCode) failure = uploadError("Aktarim eksik veya gecersiz.", 400);
      activeStream?.destroy(error);
      request.unpipe(parser);
      request.resume();
    });
    parser.on("close", async () => {
      request.off("aborted", aborted);
      await fileTask;
      if (failure) reject(failure);
      else if (file) resolve(file);
      else if (typeof content === "string") resolve({ type: "text", content });
      else reject(uploadError("Form govdesinde content alani bulunamadi.", 422));
    });
    request.pipe(parser);
  });
}
