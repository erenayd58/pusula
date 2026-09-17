import { redirect } from "next/navigation";

/** /coach → Öğrenciler (K1 ana ekran). Dikkat gerektirenler ve özet kartları Faz 3. */
export default function Page() {
  redirect("/coach/students");
}
