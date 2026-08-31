export interface ChunkMetadata {
  page?: number;
  section?: string;
  chunkIndex: number;
}

export interface TextChunk {
  content: string;
  metadata: ChunkMetadata;
}

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "300");
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "30");

// Approximate token count: ~4 chars per token for French text
const CHARS_PER_TOKEN = 4;

/**
 * Split a document text into overlapping chunks with metadata.
 * Uses structure-aware splitting: tries section headers first, then paragraphs, then sentences.
 */
export function chunkText(
  text: string,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  }
): TextChunk[] {
  const maxChars = (options?.chunkSize || CHUNK_SIZE) * CHARS_PER_TOKEN;
  const overlapChars = (options?.chunkOverlap || CHUNK_OVERLAP) * CHARS_PER_TOKEN;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Detect sections (markdown-style headers or uppercase lines)
  const sections = splitIntoSections(text);
  const chunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const section of sections) {
    const sectionChunks = splitSection(
      section.content,
      maxChars,
      overlapChars
    );

    for (const chunkContent of sectionChunks) {
      if (chunkContent.trim().length > 0) {
        chunks.push({
          content: chunkContent.trim(),
          metadata: {
            section: section.title || undefined,
            chunkIndex: globalIndex++,
          },
        });
      }
    }
  }

  return chunks;
}

/**
 * Split text into pages (for PDF content that uses page markers).
 * Page markers should be in format: \n---PAGE X---\n
 */
export function chunkTextWithPages(
  text: string,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  }
): TextChunk[] {
  const pagePattern = /---PAGE (\d+)---/g;
  const pages: { pageNum: number; content: string }[] = [];

  let lastIndex = 0;
  let match;
  let currentPage = 1;

  while ((match = pagePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pages.push({
        pageNum: currentPage,
        content: text.substring(lastIndex, match.index),
      });
    }
    currentPage = parseInt(match[1]);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    pages.push({
      pageNum: currentPage,
      content: text.substring(lastIndex),
    });
  }

  if (pages.length === 0) {
    // No page markers found, fall back to regular chunking
    return chunkText(text, options);
  }

  const maxChars =
    (options?.chunkSize || CHUNK_SIZE) * CHARS_PER_TOKEN;
  const overlapChars =
    (options?.chunkOverlap || CHUNK_OVERLAP) * CHARS_PER_TOKEN;
  const chunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageChunks = splitSection(page.content, maxChars, overlapChars);

    for (const chunkContent of pageChunks) {
      if (chunkContent.trim().length > 0) {
        chunks.push({
          content: chunkContent.trim(),
          metadata: {
            page: page.pageNum,
            chunkIndex: globalIndex++,
          },
        });
      }
    }
  }

  return chunks;
}

interface Section {
  title: string | null;
  content: string;
}

function splitIntoSections(text: string): Section[] {
  // Match markdown headers or lines that look like titles (ALL CAPS, short)
  const headerPattern = /^(#{1,4}\s+.+|[A-ZÉÈÀÊÂÔÎÛÙÇ][A-ZÉÈÀÊÂÔÎÛÙÇ\s\-:]{3,60})$/gm;
  const sections: Section[] = [];
  let lastIndex = 0;
  let currentTitle: string | null = null;
  let match;

  while ((match = headerPattern.exec(text)) !== null) {
    // Save previous section
    if (match.index > lastIndex) {
      sections.push({
        title: currentTitle,
        content: text.substring(lastIndex, match.index),
      });
    }
    currentTitle = match[1].replace(/^#+\s+/, "").trim();
    lastIndex = match.index + match[0].length;
  }

  // Add final section
  if (lastIndex < text.length) {
    sections.push({
      title: currentTitle,
      content: text.substring(lastIndex),
    });
  }

  // If no sections detected, return the whole text as one section
  if (sections.length === 0) {
    return [{ title: null, content: text }];
  }

  return sections;
}

function splitSection(
  text: string,
  maxChars: number,
  overlapChars: number
): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxChars) {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Overlap: keep last portion
        const overlapStart = Math.max(0, currentChunk.length - overlapChars);
        currentChunk = currentChunk.substring(overlapStart) + "\n\n" + para;
      } else {
        // Single paragraph too long, split by sentences
        const sentenceChunks = splitBySentences(para, maxChars, overlapChars);
        chunks.push(...sentenceChunks.slice(0, -1));
        currentChunk = sentenceChunks[sentenceChunks.length - 1] || "";
      }

      // If current chunk is still too long after adding, flush it
      if (currentChunk.length > maxChars) {
        chunks.push(currentChunk.substring(0, maxChars));
        const overlapStart = Math.max(0, maxChars - overlapChars);
        currentChunk = currentChunk.substring(overlapStart);
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function splitBySentences(
  text: string,
  maxChars: number,
  overlapChars: number
): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChars) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        const overlapStart = Math.max(0, currentChunk.length - overlapChars);
        currentChunk = currentChunk.substring(overlapStart) + sentence;
      } else {
        // Single sentence too long, just truncate
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
