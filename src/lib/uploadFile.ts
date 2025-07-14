// src/actions/uploadFile.ts
"use server";

import { uploadFileToS3 } from "@/lib/s3Upload";

/**
 * Receives a <File> streamed up from the browser, converts it to a Buffer,
 * and uploads it with the helper above.
 */
export async function uploadFileAction(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadFileToS3(buffer, file.name, file.type);
}
