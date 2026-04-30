import { adminBucket } from "./firebase";

export async function storageUpload(path: string, data: Buffer, contentType: string): Promise<void> {
  await adminBucket().file(path).save(data, { contentType, resumable: false });
}

export async function storageSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const [url] = await adminBucket()
    .file(path)
    .getSignedUrl({ action: "read", expires: Date.now() + expiresIn * 1000, version: "v4" });
  return url;
}
