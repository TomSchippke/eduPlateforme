import { prisma } from "@/lib/db";
import { embedQuery } from "./embeddings";

export interface ChunkResult {
  id: string;
  content: string;
  similarity: number;
  page: number | null;
  section: string | null;
  chunkIndex: number;
  documentId: string;
  documentName: string;
  chapitreTitle: string;
  docType?: string;
  keywords?: string[];
}

const DEFAULT_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || "0.35");
const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K || "3");

/**
 * Search for the most relevant chunks matching a query,
 * scoped to specific chapters (tenant isolation via chapter ownership).
 */
export async function searchChunks(
  query: string,
  chapitreIds: string[],
  options?: {
    topK?: number;
    threshold?: number;
  }
): Promise<ChunkResult[]> {
  if (chapitreIds.length === 0) {
    return [];
  }

  const topK = options?.topK || DEFAULT_TOP_K;
  const threshold = options?.threshold || DEFAULT_THRESHOLD;

  // Generate query embedding
  const queryEmbedding = await embedQuery(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Build the list of chapter IDs for SQL
  const chapitreIdList = chapitreIds.map((id) => `'${id}'`).join(",");

  // Hybrid search logic for "exercice X" or "exo X"
  let textMatchBoost = "0";
  const exoMatch = query.match(/(?:exo|exercice)s?\s+((?:n°\s*)?\d+)/i);
  if (exoMatch) {
    const num = exoMatch[1].replace(/n°\s*/i, ""); // extract just the number
    textMatchBoost = `CASE 
      WHEN d.doc_type = 'EXERCICES' AND (
           dc.content ILIKE '%exercice ${num}%' 
        OR dc.content ILIKE '%exo ${num}%' 
        OR dc.content ILIKE '%exercice n°${num}%'
        OR dc.content ILIKE '%exercice n° ${num}%'
        OR d.file_name ILIKE '%exercice ${num}%' 
        OR d.file_name ILIKE '%exo ${num}%'
      ) 
      THEN 1.0 ELSE 0 END`;
  }

  // Raw SQL query with pgvector cosine similarity
  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      content: string;
      similarity: number;
      page: number | null;
      section: string | null;
      chunk_index: number;
      document_id: string;
      file_name: string;
      chapitre_title: string;
    }>
  >(`
    SELECT 
      dc.id,
      dc.content,
      (1 - (dc.embedding <=> '${embeddingStr}'::vector)) + (${textMatchBoost}) as similarity,
      dc.page,
      dc.section,
      dc.chunk_index,
      dc.document_id,
      d.file_name,
      c.title as chapitre_title,
      d.doc_type,
      d.keywords
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    JOIN chapitres c ON d.chapitre_id = c.id
    WHERE d.chapitre_id IN (${chapitreIdList})
      AND d.index_status = 'INDEXED'
      AND d.visibility IN ('BOTH', 'AI_ONLY')
      AND dc.embedding IS NOT NULL
      AND (1 - (dc.embedding <=> '${embeddingStr}'::vector)) + (${textMatchBoost}) >= ${threshold}
    ORDER BY (1 - (dc.embedding <=> '${embeddingStr}'::vector)) + (${textMatchBoost}) DESC
    LIMIT ${topK}
  `);

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    similarity: r.similarity,
    page: r.page,
    section: r.section,
    chunkIndex: r.chunk_index,
    documentId: r.document_id,
    documentName: r.file_name,
    chapitreTitle: r.chapitre_title,
    docType: (r as any).doc_type,
    keywords: (r as any).keywords,
  }));
}

export async function getRandomChunks(
  chapitreIds: string[],
  limit: number = 5,
  docTypes?: string[]
): Promise<ChunkResult[]> {
  if (chapitreIds.length === 0) return [];
  const chapitreIdList = chapitreIds.map((id) => `'${id}'`).join(",");

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      content: string;
      page: number | null;
      section: string | null;
      chunk_index: number;
      document_id: string;
      file_name: string;
      chapitre_title: string;
    }>
  >(`
    SELECT 
      dc.id,
      dc.content,
      dc.page,
      dc.section,
      dc.chunk_index,
      dc.document_id,
      d.file_name,
      c.title as chapitre_title,
      d.doc_type,
      d.keywords
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    JOIN chapitres c ON d.chapitre_id = c.id
    WHERE d.chapitre_id IN (${chapitreIdList})
      AND d.index_status = 'INDEXED'
      AND d.visibility IN ('BOTH', 'AI_ONLY')
      ${docTypes && docTypes.length > 0 ? `AND d.doc_type IN (${docTypes.map(t => `'${t}'`).join(",")})` : ""}
    ORDER BY RANDOM()
    LIMIT ${limit}
  `);

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    similarity: 1.0, // Dummy similarity for random chunks
    page: r.page,
    section: r.section,
    chunkIndex: r.chunk_index,
    documentId: r.document_id,
    documentName: r.file_name,
    chapitreTitle: r.chapitre_title,
    docType: (r as any).doc_type,
    keywords: (r as any).keywords,
  }));
}

/**
 * Format retrieved chunks into a context string for the LLM prompt.
 */
export function buildContext(chunks: ChunkResult[]): string {
  if (chunks.length === 0) {
    return "AUCUN EXTRAIT PERTINENT TROUVÉ DANS LES DOCUMENTS DU COURS.";
  }

  return chunks
    .map((chunk, i) => {
      const location = [
        chunk.chapitreTitle && `Chapitre: ${chunk.chapitreTitle}`,
        chunk.documentName && `Document: ${chunk.documentName}`,
        chunk.docType && chunk.docType !== "AUTRE" && `Type: ${chunk.docType.replace("_", " ")}`,
        chunk.keywords && chunk.keywords.length > 0 && `Mots-clés: ${chunk.keywords.join(", ")}`,
        chunk.page && `Page ${chunk.page}`,
        chunk.section && `Section: ${chunk.section}`,
      ]
        .filter(Boolean)
        .join(" | ");

      return `[Extrait ${i + 1}] (${location})\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Format source citations for storage in messages.
 */
export function formatCitations(chunks: ChunkResult[]) {
  return chunks.map((chunk) => ({
    chunkId: chunk.id,
    documentName: chunk.documentName,
    chapitreTitle: chunk.chapitreTitle,
    page: chunk.page,
    section: chunk.section,
    excerpt: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? "..." : ""),
    similarity: Math.round(chunk.similarity * 100) / 100,
  }));
}
