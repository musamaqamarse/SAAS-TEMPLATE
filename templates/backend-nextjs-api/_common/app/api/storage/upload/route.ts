import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { storageUpload, storageSignedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = `${user.id}/${file.name}`;
  await storageUpload(objectPath, buffer, file.type || "application/octet-stream");
  const url = await storageSignedUrl(objectPath, 3600);
  return NextResponse.json({ path: objectPath, url });
}
