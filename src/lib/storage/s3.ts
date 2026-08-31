import type { StorageProvider } from "./interface";

/**
 * S3-compatible storage provider.
 * TODO: Implement with @aws-sdk/client-s3 for production deployment.
 *
 * Install: npm install @aws-sdk/client-s3
 *
 * Required env vars:
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT (optional)
 */
export class S3Storage implements StorageProvider {
  async upload(_file: Buffer, _path: string): Promise<string> {
    throw new Error("S3Storage not yet implemented. Set STORAGE_PROVIDER=local for development.");
  }

  async download(_path: string): Promise<Buffer> {
    throw new Error("S3Storage not yet implemented.");
  }

  async delete(_path: string): Promise<void> {
    throw new Error("S3Storage not yet implemented.");
  }

  getUrl(_path: string): string {
    throw new Error("S3Storage not yet implemented.");
  }
}
