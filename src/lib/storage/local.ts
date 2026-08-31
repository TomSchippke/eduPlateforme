import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./interface";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

export class LocalStorage implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR);
  }

  async upload(file: Buffer, filePath: string): Promise<string> {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);
    return `/uploads/${filePath}`;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, filePath);
    return fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File may not exist, ignore
    }
  }

  getUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  }
}
