import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ annonceId: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as { tenantId: string; role: string } | undefined;
    if (user?.role !== "PROF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { annonceId } = await props.params;
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const updated = await prisma.annonce.update({
      where: { id: annonceId },
      data: { title, content }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating annonce:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ annonceId: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as { tenantId: string; role: string } | undefined;
    if (user?.role !== "PROF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { annonceId } = await props.params;

    await prisma.annonce.delete({
      where: { id: annonceId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting annonce:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
