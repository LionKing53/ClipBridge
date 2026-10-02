import { createWriteStream } from "node:fs";
import { mkdir, stat, writeFile, rename, copyFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { ZipArchive } from "archiver";
import mime from "mime-types";
import {
  getWindowsClipboardItem,
  setWindowsClipboardFiles,
  setWindowsClipboardImageAndFile
} from "./clipboard-media.js";
import { getWindowsClipboard, setWindowsClipboard } from "./clipboard.js";

const MAX_FILENAME_LENGTH = 120;

function safeFilename(filename, fallback = "PanoKopru-dosya") {
  const cleaned = path.basename(filename || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);
  return cleaned || fallback;
}

async function createZip(paths, outputPath) {
  await new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    for (const sourcePath of paths) {
      const name = safeFilename(path.basename(sourcePath));
      archive.file(sourcePath, { name });
    }
    archive.finalize();
  });
}

export function createTransferHandlers(config, { onReceived = async () => {} } = {}) {
  const stateRoot = path.dirname(config.configPath);
  const inbox = path.join(stateRoot, "inbox");
  const outbox = path.join(stateRoot, "outbox");

  async function storeIncomingFile(item) {
    const filename = safeFilename(item.filename);
    const transferDirectory = path.join(
      inbox,
      `${Date.now()}-${randomBytes(4).toString("hex")}`
    );
    await mkdir(transferDirectory, { recursive: true });
    const storedPath = path.join(transferDirectory, filename);
    if (item.path) {
      try {
        await rename(item.path, storedPath);
      } catch (error) {
        if (error.code !== "EXDEV") throw error;
        await copyFile(item.path, storedPath);
        await unlink(item.path);
      }
    } else {
      await writeFile(storedPath, item.data);
    }
    return { filename, storedPath };
  }

  return {
    async setItem(item) {
      if (item.type === "text") {
        await setWindowsClipboard(item.content);
        await onReceived(item).catch(() => {});
        return { type: "text" };
      }

      if (item.type === "image") {
        const { filename, storedPath } = await storeIncomingFile(item);
        await setWindowsClipboardImageAndFile(item.data, storedPath);
        await onReceived({ ...item, data: undefined, path: storedPath }).catch(() => {});
        return { type: "image", filename };
      }

      if (item.type === "file") {
        const { filename, storedPath } = await storeIncomingFile(item);
        await setWindowsClipboardFiles([storedPath]);
        await onReceived({ ...item, data: undefined, path: storedPath }).catch(() => {});
        return { type: "file", filename };
      }

      throw new Error(`Desteklenmeyen pano turu: ${item.type}`);
    },

    async getItem() {
      const item = await getWindowsClipboardItem();
      if (item.type === "text") {
        // WinForms GetText bazi uygulamalarda bos donerse mevcut Unicode
        // metin okuyucusunu yedek olarak kullan.
        const content = item.content || await getWindowsClipboard();
        return { type: "text", content };
      }
      if (item.type === "image") {
        return {
          type: "image",
          data: item.data,
          filename: "PanoKopru.png",
          mimeType: "image/png"
        };
      }
      if (item.type === "files") {
        const paths = [];
        for (const candidate of item.paths || []) {
          const info = await stat(candidate).catch(() => null);
          if (info?.isFile()) paths.push(candidate);
        }
        if (paths.length === 0) {
          throw new Error("Windows panosundaki dosyalar artik mevcut degil.");
        }
        if (paths.length === 1) {
          const sourcePath = paths[0];
          return {
            type: "file",
            path: sourcePath,
            filename: safeFilename(path.basename(sourcePath)),
            mimeType: mime.lookup(sourcePath) || "application/octet-stream"
          };
        }

        await mkdir(outbox, { recursive: true });
        const zipPath = path.join(outbox, `PanoKopru-${Date.now()}.zip`);
        await createZip(paths, zipPath);
        return {
          type: "file",
          path: zipPath,
          filename: "PanoKopru-Dosyalar.zip",
          mimeType: "application/zip",
          temporary: true
        };
      }
      throw new Error(`Desteklenmeyen Windows pano turu: ${item.type}`);
    }
  };
}
