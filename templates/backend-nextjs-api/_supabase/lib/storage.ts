import { adminClient } from "./supabase";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "__PROJECT_KEBAB__-uploads";

export async function storageUpload(path: string, data: Buffer, contentType: string): Promise<void> {
  const { error } = await adminClient()
    .storage
    .from(BUCKET)
    .upload(path, data, { contentType, upsert: true });
  if (error) throw error;
}

export async function storageSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await adminClient()
    .storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
