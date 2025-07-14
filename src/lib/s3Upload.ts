import "server-only";

import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

AWS.config.update({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const s3 = new AWS.S3();

/** Uploads a binary buffer to S3 and returns the public URL. */
export async function uploadFileToS3(body: Buffer, fileName: string, mimeType: string) {
  "use server"; // extra guard

  const key = `${uuidv4()}-${fileName}`;

  await s3
    .putObject({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: mimeType,
    })
    .promise();

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
