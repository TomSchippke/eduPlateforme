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

  // Sur Vercel, le filesystem est en lecture seule — le local storage ne peut pas fonctionner.
  // On force vercel_blob si le token est disponible, quel que soit STORAGE_PROVIDER.
  if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
    provider = "vercel_blob";
  }

  // En dehors de Vercel : fallback vers vercel_blob si le token est présent mais STORAGE_PROVIDER absent.
  if (!provider && process.env.BLOB_READ_WRITE_TOKEN) {
    provider = "vercel_blob";
  }

  // Fallback final sur local (dev uniquement)
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
