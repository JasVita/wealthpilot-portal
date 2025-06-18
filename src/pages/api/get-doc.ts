import { NextApiRequest, NextApiResponse } from "next";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { id } = req.query; // SK
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const command = new GetCommand({
      TableName: "exampleTable",
      Key: { PK: "doc", SK: id },
    });

    const result = await ddbDocClient.send(command);
    if (!result.Item) return res.status(404).json({ error: "Not found" });
    res.status(200).json(result.Item);
  } catch (err: any) {
    console.error("DynamoDB Error:", err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
}
