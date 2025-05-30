import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

AWS.config.update({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

const s3 = new AWS.S3();

export const uploadFileToS3 = async (file: File): Promise<string> => {
  const fileKey = `${uuidv4()}-${file.name}`;

  await s3
    .putObject({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: fileKey,
      Body: file,
      ContentType: file.type,
      // Removed ACL line here
    })
    .promise();

  const link = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${fileKey}`;

  return link;
};
