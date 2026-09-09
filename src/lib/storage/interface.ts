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

  // Détection de l'environnement serverless (Vercel, AWS Lambda, etc.)
  // Le filesystem est en lecture seule — le local storage ne peut pas fonctionner.
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.cwd().startsWith("/var/task")
  );

  if (isServerless && provider === "local") {
    console.warn(
      `[Storage] STORAGE_PROVIDER="local" ignoré en environnement serverless. ` +
      `BLOB_READ_WRITE_TOKEN=${process.env.BLOB_READ_WRITE_TOKEN ? "set" : "NOT SET"}`
    );
    provider = undefined;
  }

  // Utiliser vercel_blob si le token est disponible
  if (!provider && process.env.BLOB_READ_WRITE_TOKEN) {
    provider = "vercel_blob";
  }

  // Fallback final sur local (dev uniquement)
  if (!provider) {
    provider = "local";
  }

  console.log(`[Storage] Using provider: ${provider}`);

  if (provider === "vercel_blob") {
    return new VercelBlobStorage();
  }

  if (provider === "s3") {
    return new S3Storage();
  }

  return new LocalStorage();
}
