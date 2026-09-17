import { redirect } from "next/navigation";

/** /student → Bugün. */
export default function Page() {
  redirect("/student/today");
}
