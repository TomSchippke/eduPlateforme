export interface StorageProvider {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

export function getStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";
  if (provider === "s3") {
    return new S3Storage();
  }
  return new LocalStorage();
}
