import { NextApiRequest, NextApiResponse } from "next";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { mockData } = req.body;
  const sk = Date.now().toString();
  try {
    const command = new PutCommand({
      TableName: "exampleTable",
      Item: { PK: `doc`, SK: sk, ...mockData },
    });

    await ddbDocClient.send(command);
    res.status(200).json({ sk });
  } catch (err: any) {
    console.error("DynamoDB Error:", err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
}
