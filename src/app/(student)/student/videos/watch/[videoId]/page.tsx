import { notFound, redirect } from "next/navigation";
import { resolveWatch } from "@/features/videos";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

/** Plan kartındaki "İzle": videoyu listesinde açar (`/student/videos/[playlistId]?v=`). */
export default async function WatchRedirectPage({
  params,
}: PageProps<"/student/videos/watch/[videoId]">) {
  const { videoId } = await params;
  const { userId } = await requireRole("student");
  await requireModule(userId, "videos");
  const target = await resolveWatch(videoId);
  if (!target) notFound();
  redirect(`/student/videos/${target.playlistId}?v=${videoId}`);
}
