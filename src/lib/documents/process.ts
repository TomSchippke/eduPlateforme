import { prisma } from "@/lib/db";
import { extractText } from "./extract";
import { chunkText, chunkTextWithPages } from "@/lib/ai/chunker";
import { embedBatch } from "@/lib/ai/embeddings";
import { getStorage } from "@/lib/storage/interface";

/**
 * Process a document: extract text, chunk it, generate embeddings, and store in DB.
 * This is the full pipeline triggered after a document upload.
 */
export async function processDocument(documentId: string): Promise<void> {
  const storage = getStorage();

  try {
    // Mark as processing
    await prisma.document.update({
      where: { id: documentId },
      data: { indexStatus: "PROCESSING" },
    });

    // Get the document
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Download the file
    const storagePath = doc.storageUrl.replace(/^\/uploads\//, "");
    const fileBuffer = await storage.download(storagePath);

    // Extract text
    const extractedText = await extractText(fileBuffer, doc.fileType);

    // Update extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: { extractedText },
    });

    // Chunk the text
    const hasPageMarkers = extractedText.includes("---PAGE ");
    const chunks = hasPageMarkers
      ? chunkTextWithPages(extractedText)
      : chunkText(extractedText);

    if (chunks.length === 0) {
      throw new Error("Aucun contenu extractible trouvé dans le document.");
    }

    // Generate embeddings in batch
    const texts = chunks.map((c) => c.content);
    const embeddings = await embedBatch(texts);

    // Delete existing chunks for this document (in case of re-processing)
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    // Insert chunks with embeddings using raw SQL (Prisma doesn't support vector type natively)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const embeddingStr = `[${embedding.join(",")}]`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO document_chunks (id, document_id, content, embedding, page, section, chunk_index, created_at)
        VALUES (
          gen_random_uuid()::text,
          '${documentId}',
          $1,
          '${embeddingStr}'::vector,
          ${chunk.metadata.page ?? "NULL"},
          ${chunk.metadata.section ? `'${chunk.metadata.section.replace(/'/g, "''")}'` : "NULL"},
          ${chunk.metadata.chunkIndex},
          NOW()
        )
      `, chunk.content);
    }

    // Mark as indexed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        indexStatus: "INDEXED",
        indexError: null,
      },
    });

    console.log(
      `Document ${documentId} processed: ${chunks.length} chunks created`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Error processing document ${documentId}:`, errorMessage);

    // Mark as error
    await prisma.document.update({
      where: { id: documentId },
      data: {
        indexStatus: "ERROR",
        indexError: errorMessage,
      },
    });
  }
}
