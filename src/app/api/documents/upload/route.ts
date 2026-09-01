import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage/interface";
import { processDocument } from "@/lib/documents/process";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const chapitreId = formData.get("chapitreId") as string;
    const visibility = (formData.get("visibility") as any) || "BOTH";
    const docType = (formData.get("docType") as any) || "AUTRE";
    const keywordsStr = formData.get("keywords") as string;
    const keywords = keywordsStr ? keywordsStr.split(",").map(k => k.trim()).filter(Boolean) : [];

    if (!file || !chapitreId) {
      return NextResponse.json({ error: "Fichier et chapitre requis" }, { status: 400 });
    }

    // Verify chapitre belongs to this tenant
    const chapitre = await prisma.chapitre.findFirst({
      where: {
        id: chapitreId,
        groupe: { profId: user.id },
      },
    });

    if (!chapitre) {
      return NextResponse.json({ error: "Chapitre non trouvé" }, { status: 404 });
    }

    // Validate file type
    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const allowedTypes = ["pdf", "docx", "txt", "md"];

    if (!allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: `Format non supporté. Formats acceptés : ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Store the file
    const storage = getStorage();
    const storagePath = `${user.tenantId}/${chapitreId}/${Date.now()}-${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storageUrl = await storage.upload(buffer, storagePath);

    // Create document record
    const document = await prisma.document.create({
      data: {
        chapitreId,
        fileName,
        fileType: ext,
        storageUrl,
        fileSize: buffer.length,
        indexStatus: "PENDING",
        visibility,
        docType,
        keywords,
      },
    });

    // Process document immediately (awaits completion so Vercel doesn't kill the lambda)
    try {
      await processDocument(document.id);
    } catch (processError) {
      console.error("Error processing document:", processError);
      // We don't fail the upload if processing fails, but it will stay PENDING or ERROR
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
