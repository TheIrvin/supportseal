import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Attachment storage abstraction (architecture.md: recoverable file store —
 * local for simple self-hosting, S3-compatible for managed storage later).
 * The local adapter stores files under STORAGE_DIR (default .dev-data/uploads
 * in dev) using unguessable generated keys — never the user-supplied name.
 */
export interface AttachmentStorage {
  put(data: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

const UPLOADS_DIR = process.env.STORAGE_DIR?.trim() || path.join(".dev-data", "uploads");

class LocalAttachmentStorage implements AttachmentStorage {
  async put(data: Uint8Array): Promise<string> {
    const key = `${randomUUID()}${createHash("sha256").update(data).digest("hex").slice(0, 16)}`;
    const dir = path.join(UPLOADS_DIR, key.slice(0, 2));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, key), data);
    return key;
  }

  async get(key: string): Promise<Uint8Array> {
    if (!/^[a-f0-9-]+$/u.test(key)) throw new Error("Invalid storage key.");
    const file = await readFile(path.join(UPLOADS_DIR, key.slice(0, 2), key));
    return new Uint8Array(file);
  }

  async delete(key: string): Promise<void> {
    if (!/^[a-f0-9-]+$/u.test(key)) throw new Error("Invalid storage key.");
    await rm(path.join(UPLOADS_DIR, key.slice(0, 2), key), { force: true });
  }
}

const globalForStorage = globalThis as unknown as { __supportsealStorage?: AttachmentStorage };

export function getAttachmentStorage(): AttachmentStorage {
  globalForStorage.__supportsealStorage ??= new LocalAttachmentStorage();
  return globalForStorage.__supportsealStorage;
}

/** Test helper: swap the storage adapter (in-memory). */
export function setAttachmentStorageForTest(storage: AttachmentStorage): void {
  globalForStorage.__supportsealStorage = storage;
}
