"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, PencilLineIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { FormError } from "@/components/shared/form-error";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addTopic, deleteTopic, moveTopic, renameTopic } from "../server/actions";
import type {
  TemplateEditor as TemplateEditorData,
  TemplateSubject,
  TemplateTopic,
} from "../types";

/**
 * Koç şablon editörü (K sade yüzey): ders başlıkları altında konu listesi; konu ekle (dersin
 * sonuna), adını değiştir (satır içi), sil (onay: kaç öğrencinin ilerlemesi var), ↑↓ taşı.
 * Alt konular girintili; sürükle-bırak ve şablon kopyalama yok (Faz 2 kapsamı).
 */
export function TemplateEditor({ template }: { template: TemplateEditorData }) {
  return (
    <div className="flex flex-col gap-6">
      {template.subjects.map((subject) => (
        <SubjectSection key={subject.subjectId} subject={subject} />
      ))}
    </div>
  );
}

function SubjectSection({ subject }: { subject: TemplateSubject }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const headingId = `template-subject-${subject.subjectId}`;
  const unitCount = subject.topics.length;

  function add(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await addTopic({ subjectId: subject.subjectId, name });
      if (!result.ok) {
        setError(result.fieldErrors?.name?.[0] ?? result.error);
        return;
      }
      toast.success(`Konu eklendi: ${name.trim()}.`);
      setName("");
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby={headingId}
      style={subjectVars(subject.color)}
      className="rounded-sm border border-line bg-bg-paper"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id={headingId} className="flex items-center gap-3 text-heading font-semibold">
          <SubjectBadge color={subject.color} shortName={subject.shortName} />
          {subject.name}
        </h2>
        <span className="text-small text-ink-500">{formatCount(unitCount, "konu")}</span>
      </header>

      {unitCount === 0 ? (
        <p className="px-4 py-3 text-small text-ink-500">
          Bu derste henüz konu yok. Aşağıdan ekle.
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {subject.topics.map((topic, index) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              depth={0}
              isFirst={index === 0}
              isLast={index === unitCount - 1}
            />
          ))}
        </ol>
      )}

      <form
        onSubmit={add}
        className="flex flex-wrap items-end gap-3 border-t border-line px-4 py-3"
      >
        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <Label htmlFor={`add-topic-${subject.subjectId}`}>Yeni konu</Label>
          <Input
            id={`add-topic-${subject.subjectId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Konu adı"
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending || name.trim().length < 2}>
          <PlusIcon aria-hidden="true" />
          Konu ekle
        </Button>
        {error ? (
          <div className="basis-full">
            <FormError message={error} />
          </div>
        ) : null}
      </form>
    </section>
  );
}

function TopicRow({
  topic,
  depth,
  isFirst,
  isLast,
}: {
  topic: TemplateTopic;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string>();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(success);
      setEditing(false);
      setConfirmDelete(false);
      router.refresh();
    });
  }

  function saveName(event: React.FormEvent) {
    event.preventDefault();
    run(() => renameTopic({ topicId: topic.id, name }), `Konu adı değişti: ${name.trim()}.`);
  }

  const progressText =
    topic.progressStudents === 0
      ? "Hiçbir öğrencinin bu konuda ilerleme kaydı yok."
      : `${formatCount(topic.progressStudents, "öğrencinin")} bu konudaki ilerlemesi konuyla birlikte silinecek.`;

  return (
    <li className="flex flex-col">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-4 py-2",
          depth > 0 && "pl-10 text-ink-700",
        )}
      >
        {editing ? (
          <form onSubmit={saveName} className="flex flex-1 flex-wrap items-center gap-2">
            <Label htmlFor={`rename-${topic.id}`} className="sr-only">
              Konu adı
            </Label>
            <Input
              id={`rename-${topic.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-48 flex-1"
              autoFocus
              required
            />
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              Kaydet
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setName(topic.name);
                setError(undefined);
              }}
            >
              Vazgeç
            </Button>
          </form>
        ) : (
          <span className="flex-1 text-body">{topic.name}</span>
        )}

        {editing ? null : (
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={`${topic.name} işlemleri`}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${topic.name}: yukarı taşı`}
              disabled={pending || isFirst}
              onClick={() =>
                run(() => moveTopic({ topicId: topic.id, direction: "up" }), "Sıra güncellendi.")
              }
            >
              <ArrowUpIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${topic.name}: aşağı taşı`}
              disabled={pending || isLast}
              onClick={() =>
                run(() => moveTopic({ topicId: topic.id, direction: "down" }), "Sıra güncellendi.")
              }
            >
              <ArrowDownIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${topic.name}: adını değiştir`}
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              <PencilLineIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${topic.name}: sil`}
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
        )}
        {error ? (
          <div className="basis-full">
            <FormError message={error} />
          </div>
        ) : null}
      </div>

      {topic.children.length > 0 ? (
        <ol className="divide-y divide-line border-t border-line">
          {topic.children.map((child, index) => (
            <TopicRow
              key={child.id}
              topic={child}
              depth={depth + 1}
              isFirst={index === 0}
              isLast={index === topic.children.length - 1}
            />
          ))}
        </ol>
      ) : null}

      <ResponsiveSheet open={confirmDelete} onOpenChange={setConfirmDelete}>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Konuyu sil</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              &ldquo;{topic.name}&rdquo; şablondan kaldırılacak. {progressText}
              {topic.children.length > 0
                ? ` Alt konuları (${formatCount(topic.children.length, "adet")}) da silinir.`
                : ""}
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <ResponsiveSheetFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => deleteTopic({ topicId: topic.id }), `Konu silindi: ${topic.name}.`)
              }
            >
              {pending ? "Siliniyor…" : "Konuyu sil"}
            </Button>
          </ResponsiveSheetFooter>
        </ResponsiveSheetContent>
      </ResponsiveSheet>
    </li>
  );
}
