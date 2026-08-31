import { NextResponse } from "next/server";
import { processDocument } from "@/lib/documents/process";

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    // Process in background (fire and forget)
    // In production, use a proper queue (BullMQ, etc.)
    processDocument(documentId).catch((error) => {
      console.error(`Background processing failed for ${documentId}:`, error);
    });

    return NextResponse.json({ message: "Processing started" });
  } catch (error) {
    console.error("Process API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
