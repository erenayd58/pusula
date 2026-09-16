import { redirect } from "next/navigation";
import { getSessionUser, homeFor, pathForMissingProfile } from "@/lib/auth";

/** Kök: oturuma göre yönlendirir (proxy rol claim'i varsa daha önce yönlendirmiş olur). */
export default async function HomePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  redirect(session.profile ? homeFor(session.profile.role) : pathForMissingProfile(session));
}
