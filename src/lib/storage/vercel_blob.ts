import { put, del } from "@vercel/blob";
import type { StorageProvider } from "./interface";

export class VercelBlobStorage implements StorageProvider {
  async upload(file: Buffer, path: string): Promise<string> {
    // Vercel Blob automatically handles unique names if you don't enforce overwrites,
    // but here we just upload it to the given path.
    const { url } = await put(path, file, { access: "public" });
    return url;
  }

  async download(path: string): Promise<Buffer> {
    // Vercel Blob files are served publicly via the URL.
    // If we need the raw buffer on the server, we fetch it.
    const url = this.getUrl(path);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download blob from ${url}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(path: string): Promise<void> {
    const url = this.getUrl(path);
    await del(url);
  }

  getUrl(path: string): string {
    // Note: Vercel Blob paths are usually the full URL when returned from put().
    // We should make sure we return the correct URL.
    // If the path is already a URL, return it directly.
    if (path.startsWith("http")) {
      return path;
    }
    throw new Error("VercelBlobStorage expects full URLs for getUrl, but got a raw path.");
  }
}
