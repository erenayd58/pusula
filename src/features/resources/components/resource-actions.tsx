"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { PickableStudent } from "@/components/shared/student-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { deleteResource, keepInCatalog, unassignResource } from "../server/actions";
import type { ResourceDetail } from "../types";
import { AssignResourceButton } from "./assign-button";

const BASE = "/coach/resources";

/** Koç kitap detayı başlık eylemleri: Düzenle · (özel kaynakta) Katalogda tut · Kaldır. */
export function ResourceActions({ resource }: { resource: ResourceDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function keep() {
    startTransition(async () => {
      const result = await keepInCatalog({ id: resource.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Kaynak kataloğa alındı.");
      router.refresh();
    });
  }

  function remove() {
    if (
      !window.confirm(
        `“${resource.title}” kaldırılsın mı? Testleri silinir; öğrencilerin soru kayıtları kalır, kaynak bağı kalkar.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteResource({ id: resource.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Kaynak kaldırıldı.");
      router.push(BASE);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {resource.studentId ? (
        <>
          <Badge>{`Öğrenci ekledi: ${resource.studentName ?? "—"}`}</Badge>
          <Button type="button" variant="secondary" onClick={keep} disabled={pending}>
            Katalogda tut
          </Button>
        </>
      ) : null}
      <Button variant="secondary" asChild>
        <Link href={`${BASE}/${resource.id}?edit=1`}>
          <PencilIcon aria-hidden="true" />
          Düzenle
        </Link>
      </Button>
      <Button type="button" variant="secondary" onClick={remove} disabled={pending}>
        <Trash2Icon aria-hidden="true" />
        Kaldır
      </Button>
    </div>
  );
}

/** Atanmış öğrenciler listesi + "Öğrenciye ata"; satırda atamayı kaldır. */
export function AssignedStudents({
  resource,
  students,
}: {
  resource: ResourceDetail;
  students: PickableStudent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function unassign(studentId: string, fullName: string) {
    if (!window.confirm(`${fullName} için atama kaldırılsın mı? Soru kayıtları kalır.`)) return;
    startTransition(async () => {
      const result = await unassignResource({ resourceId: resource.id, studentId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Atama kaldırıldı.");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="assigned-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="assigned-heading" className="text-heading font-semibold text-ink-900">
          {`Atanan öğrenciler · ${formatCount(resource.assigned.length, "öğrenci")}`}
        </h2>
        <AssignResourceButton
          resourceId={resource.id}
          resourceTitle={resource.title}
          students={students}
        />
      </div>
      {resource.assigned.length === 0 ? (
        <p className="text-small text-ink-500">Henüz atanmadı.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="assigned-students">
          {resource.assigned.map((a) => (
            <li
              key={a.studentId}
              className="flex items-center gap-1 rounded-xs border border-line bg-bg-paper py-1 pr-1 pl-3 text-small"
            >
              <Link
                href={`/coach/students/${a.studentId}/resources`}
                className="text-ink-900 underline-offset-4 hover:underline"
              >
                {a.fullName}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 pointer-coarse:size-9"
                aria-label={`${a.fullName} atamasını kaldır`}
                disabled={pending}
                onClick={() => unassign(a.studentId, a.fullName)}
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
