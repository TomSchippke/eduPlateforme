export interface StorageProvider {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import { VercelBlobStorage } from "./vercel_blob";

export function getStorage(): StorageProvider {
  let provider = process.env.STORAGE_PROVIDER;

  // Si l'utilisateur a configuré Vercel Blob (token présent) mais oublié de définir STORAGE_PROVIDER,
  // on utilise vercel_blob par défaut au lieu de crasher sur Vercel avec le local storage.
  if (!provider && process.env.BLOB_READ_WRITE_TOKEN) {
    provider = "vercel_blob";
  }

  // Fallback final sur local
  if (!provider) {
    provider = "local";
  }

  if (provider === "vercel_blob") {
    return new VercelBlobStorage();
  }

  if (provider === "s3") {
    return new S3Storage();
  }

  return new LocalStorage();
}
