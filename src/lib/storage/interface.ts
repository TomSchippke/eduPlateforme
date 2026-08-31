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
  // En production sur Vercel, on force Vercel Blob. 
  // S'il manque le token, @vercel/blob renverra une erreur claire (Missing token)
  // au lieu d'essayer de créer un dossier avec fs.mkdir.
  if (process.env.VERCEL === "1" || process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorage();
  }

  const provider = process.env.STORAGE_PROVIDER || "local";
  
  if (provider === "vercel_blob") {
    return new VercelBlobStorage();
  }
  
  if (provider === "s3") {
    return new S3Storage();
  }
  
  return new LocalStorage();
}
