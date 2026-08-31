import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string })?.role;
    if (role === "PROF") {
      redirect("/prof/dashboard");
    } else {
      redirect("/eleve/dashboard");
    }
  }

  redirect("/login");
}
