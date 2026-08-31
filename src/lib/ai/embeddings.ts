const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3-lite";
const EMBEDDING_DIMENSIONS = 512;

/**
 * Generate an embedding for a single text using Voyage AI.
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await embedBatch([text]);
  return result[0];
}

/**
 * Generate embeddings for multiple texts using Voyage AI.
 * Batches are limited to 128 texts per request.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set");
  }

  const allEmbeddings: number[][] = [];
  const batchSize = 128;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: batch,
        input_type: i === 0 && texts.length === 1 ? "query" : "document",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const embeddings = data.data.map(
      (item: { embedding: number[] }) => item.embedding
    );
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

/**
 * Generate a query embedding (optimized for search).
 */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set");
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text],
      input_type: "query",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export { EMBEDDING_DIMENSIONS };
