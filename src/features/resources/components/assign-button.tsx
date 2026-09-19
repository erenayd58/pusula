"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { StudentPicker, type PickableStudent } from "@/components/shared/student-picker";
import { Button } from "@/components/ui/button";
import { assignResource } from "../server/actions";

/** "Öğrenciye ata" (koç): ortak `StudentPicker` → `assignResource` (tek insert, çoklu öğrenci). */
export function AssignResourceButton({
  resourceId,
  resourceTitle,
  students,
}: {
  resourceId: string;
  resourceTitle: string;
  students: PickableStudent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm(studentIds: string[]) {
    startTransition(async () => {
      const result = await assignResource({ resourceId, studentIds });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlusIcon aria-hidden="true" />
        Öğrenciye ata
      </Button>
      <StudentPicker
        open={open}
        onOpenChange={setOpen}
        title="Öğrenciye ata"
        description={`“${resourceTitle}” seçtiğin öğrencilerin kaynak listesine eklenir.`}
        students={students}
        pending={pending}
        onConfirm={confirm}
      />
    </>
  );
}
