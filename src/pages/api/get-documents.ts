// pages/api/batch-get-docs.ts
import { NextApiRequest, NextApiResponse } from "next";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "@/lib/db";

import type { docid } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { keys } = req.body as { keys?: docid[] };
  if (!Array.isArray(keys) || !keys.length)
    return res.status(400).json({ error: "Body must include non-empty `keys` array." });

  const MAX_KEYS = 100;

  try {
    // Split into 100-key chunks (handles >100 keys transparently)
    const chunks: docid[][] = [];
    for (let i = 0; i < keys.length; i += MAX_KEYS) chunks.push(keys.slice(i, i + MAX_KEYS));

    // Fetch each chunk in parallel
    const chunkPromises = chunks.map(async (chunk) => {
      const command = new BatchGetCommand({
        RequestItems: {
          exampleTable: {
            Keys: chunk,
          },
        },
      });

      let response = await ddbDocClient.send(command);

      // Handle any unprocessed keys with exponential back-off
      let unprocessed = response.UnprocessedKeys?.exampleTable?.Keys ?? [];
      let attempts = 0;
      while (unprocessed.length && attempts < 5) {
        await new Promise((r) => setTimeout(r, 2 ** attempts * 100)); // back-off
        response = await ddbDocClient.send(
          new BatchGetCommand({
            RequestItems: { exampleTable: { Keys: unprocessed } },
          })
        );
        unprocessed = response.UnprocessedKeys?.exampleTable?.Keys ?? [];
        attempts++;
      }

      return response.Responses?.exampleTable ?? [];
    });

    // Flatten results and re-order to match input keys
    const fetchedItems = (await Promise.all(chunkPromises)).flat();
    const itemMap = new Map(fetchedItems.map((item) => [`${item.PK}#${item.SK}`, item]));

    const ordered = keys.map(({ PK, SK }) => itemMap.get(`${PK}#${SK}`) ?? null);

    res.status(200).json({ items: ordered });
  } catch (err: any) {
    console.error("BatchGet Error:", err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
}
