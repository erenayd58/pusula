"use client";

import { useState, useTransition } from "react";
import { KeyRoundIcon, Trash2Icon, UserCogIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignCoach, deleteStudent, resetStudentPassword } from "../server/student-admin-actions";
import { FormError } from "./form-error";
import { InviteParentDialog } from "./invite-parent-dialog";
import { NativeSelect } from "./native-select";

type Student = { profileId: string; fullName: string; coachId: string };
type CoachOption = { id: string; fullName: string };

/** Satır eylemleri: şifre sıfırla (koç/owner), koç ata ve sil (owner). Her biri kendi diyaloğu. */
export function StudentRowActions({
  student,
  viewerRole,
  coaches,
}: {
  student: Student;
  viewerRole: "coach" | "owner";
  coaches: CoachOption[];
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <InviteParentDialog student={student} />
      <ResetPasswordDialog student={student} />
      {viewerRole === "owner" ? (
        <>
          <AssignCoachDialog student={student} coaches={coaches} />
          <DeleteStudentDialog student={student} />
        </>
      ) : null}
    </div>
  );
}

function ResetPasswordDialog({ student }: { student: Student }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await resetStudentPassword({
        studentId: student.profileId,
        newPassword: password,
      });
      if (!result.ok) {
        setError(result.fieldErrors?.newPassword?.[0] ?? result.error);
        return;
      }
      toast.success(`${student.fullName} için şifre sıfırlandı.`);
      setPassword("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="default">
          <KeyRoundIcon aria-hidden="true" />
          Şifre sıfırla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Şifreyi sıfırla</DialogTitle>
            <DialogDescription>
              {student.fullName} için yeni bir geçici şifre belirle ve öğrenciye ilet. Eski şifre
              geçersiz olur.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor={`new-password-${student.profileId}`}>Yeni şifre</Label>
            <Input
              id={`new-password-${student.profileId}`}
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              required
            />
          </div>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sıfırlanıyor…" : "Şifreyi sıfırla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignCoachDialog({ student, coaches }: { student: Student; coaches: CoachOption[] }) {
  const [open, setOpen] = useState(false);
  const [coachId, setCoachId] = useState(student.coachId);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await assignCoach({ studentId: student.profileId, coachId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Koç atandı.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <UserCogIcon aria-hidden="true" />
          Koç ata
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Koç ata</DialogTitle>
            <DialogDescription>{student.fullName} için sorumlu koçu seç.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor={`coach-${student.profileId}`}>Koç</Label>
            <NativeSelect
              id={`coach-${student.profileId}`}
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
            >
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </NativeSelect>
          </div>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending || coaches.length === 0}>
              {pending ? "Atanıyor…" : "Koçu ata"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStudentDialog({ student }: { student: Student }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteStudent({ studentId: student.profileId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`${student.fullName} silindi.`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Trash2Icon aria-hidden="true" />
          Sil
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Öğrenciyi sil</DialogTitle>
          <DialogDescription>
            {student.fullName} ve tüm çalışma verisi kalıcı olarak silinir; hesabı kapanır. Bu işlem
            geri alınamaz.
          </DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button type="button" onClick={confirm} disabled={pending}>
            {pending ? "Siliniyor…" : "Öğrenciyi sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
