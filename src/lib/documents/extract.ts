// Configure pdf.js worker BEFORE importing pdfjs-dist.
// This avoids the dynamic import() that Next.js cannot bundle.
// @ts-ignore -- no .d.ts for the worker .mjs entry
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
(globalThis as any).pdfjsWorker = pdfjsWorker;

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
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
    const data = new Uint8Array(buffer);
    const loadingTask = getDocument({
      data,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const parts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");

      if (pageText.trim()) {
        if (numPages > 1) {
          parts.push(`---PAGE ${i}---\n${pageText}`);
        } else {
          parts.push(pageText);
        }
      }
    }

    const text = parts.join("\n");

    if (!text || text.trim().length < 50) {
      throw new Error(
        "Le PDF semble être un scan ou une image. " +
        "Veuillez uploader un PDF avec du texte sélectionnable, " +
        "ou convertir le document en format texte."
      );
    }

    return text;
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
