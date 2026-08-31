import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import fs from "fs/promises";

/**
 * Extract text content from a document buffer based on its file type.
 */
export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return extractFromPDF(buffer);
    case "docx":
      return extractFromDOCX(buffer);
    case "txt":
    case "md":
    case "markdown":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract text from a PDF file.
 * Handles born-digital PDFs. Scanned PDFs will return minimal/no text.
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const info = await parser.getInfo();
    await parser.destroy();

    const text = result.text;
    const numPages = info.total;

    if (!text || text.trim().length < 50) {
      throw new Error(
        "Le PDF semble être un scan ou une image. " +
        "Veuillez uploader un PDF avec du texte sélectionnable, " +
        "ou convertir le document en format texte."
      );
    }

    // Add page markers for chunking
    // pdf-parse doesn't provide page-level text natively,
    // but we can estimate based on the numpages
    if (numPages <= 1) {
      return text;
    }

    // Simple heuristic: split text roughly by pages
    const avgCharsPerPage = Math.ceil(text.length / numPages);
    const parts: string[] = [];

    for (let i = 0; i < numPages; i++) {
      const start = i * avgCharsPerPage;
      const end = Math.min((i + 1) * avgCharsPerPage, text.length);
      const pageText = text.substring(start, end);
      if (pageText.trim()) {
        parts.push(`---PAGE ${i + 1}---\n${pageText}`);
      }
    }

    return parts.join("\n");
  } catch (error) {
    if (error instanceof Error && error.message.includes("scan")) {
      throw error;
    }
    throw new Error(`Erreur lors de l'extraction du PDF: ${(error as Error).message}`);
  }
}

/**
 * Extract text from a DOCX file.
 */
async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length < 10) {
      throw new Error("Le document DOCX semble vide ou non lisible.");
    }

    if (result.messages.length > 0) {
      console.warn(
        "Mammoth warnings:",
        result.messages.map((m) => m.message).join(", ")
      );
    }

    return result.value;
  } catch (error) {
    throw new Error(`Erreur lors de l'extraction du DOCX: ${(error as Error).message}`);
  }
}

/**
 * Read a file from disk and extract its text.
 */
export async function extractTextFromFile(
  filePath: string,
  fileType: string
): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return extractText(buffer, fileType);
}
