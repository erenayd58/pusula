"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { similarTitles } from "@/lib/text/similar";
import { cn } from "@/lib/utils";
import { createPlaylistSchema, importPlaylistSchema, updatePlaylistSchema } from "../schemas";
import {
  createManualPlaylist,
  importPlaylist,
  selfAssignPlaylist,
  updatePlaylist,
} from "../server/actions";
import type { CatalogTitle, PlaylistDetail, VideoOptions } from "../types";

type Mode = "import" | "manual";

/**
 * Liste formu (11 §2 Parça 2): "YouTube listesi" (bağlantı yapıştır → sunucu içe aktarır; anahtar
 * yoksa nötr not + elle liste) / "Elle liste kur" (ad; videolar tek tek eklenir). Ders çipi +
 * "Karışık". Elle listede benzer ad önerisi. Düzenleme modunda ad / kanal / ders.
 */
export function PlaylistForm({
  options,
  catalog,
  audience,
  basePath,
  playlist,
}: {
  options: VideoOptions;
  catalog: CatalogTitle[];
  audience: "student" | "coach";
  basePath: string;
  playlist?: PlaylistDetail;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const editing = playlist !== undefined;
  const [mode, setMode] = useState<Mode>(options.canImport ? "import" : "manual");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState(playlist?.title ?? "");
  const [channelName, setChannelName] = useState(playlist?.channelName ?? "");
  const [subjectId, setSubjectId] = useState<string | null>(
    editing ? playlist.subjectId : (options.subjects[0]?.subjectId ?? null),
  );
  const suggestions = editing || mode !== "manual" ? [] : similarTitles(title, catalog);

  function fail(message: string, fieldErrors?: Record<string, string[]>) {
    setFormError(message);
    if (fieldErrors) {
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0]])));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    setErrors({});
    if (editing) {
      const parsed = updatePlaylistSchema.safeParse({
        id: playlist.id,
        title,
        channelName,
        subjectId,
      });
      if (!parsed.success) {
        setErrors({ title: parsed.error.issues[0]?.message });
        return;
      }
      startTransition(async () => {
        const result = await updatePlaylist(parsed.data);
        if (!result.ok) return fail(result.error, result.fieldErrors);
        toast.success("Liste güncellendi.");
        router.push(`${basePath}/${playlist.id}`);
        router.refresh();
      });
      return;
    }
    if (mode === "import") {
      const parsed = importPlaylistSchema.safeParse({
        templateId: options.templateId,
        url,
        subjectId,
      });
      if (!parsed.success) {
        setErrors({ url: parsed.error.issues[0]?.message });
        return;
      }
      startTransition(async () => {
        const result = await importPlaylist(parsed.data);
        if (!result.ok) return fail(result.error, result.fieldErrors);
        toast.success(`Liste içe aktarıldı: ${result.data.message}`);
        router.push(`${basePath}/${result.data.id}`);
        router.refresh();
      });
      return;
    }
    const parsed = createPlaylistSchema.safeParse({
      templateId: options.templateId,
      title,
      subjectId,
    });
    if (!parsed.success) {
      setErrors({ title: parsed.error.issues[0]?.message });
      return;
    }
    startTransition(async () => {
      const result = await createManualPlaylist(parsed.data);
      if (!result.ok) return fail(result.error, result.fieldErrors);
      toast.success(
        `Liste kuruldu.${audience === "student" ? " Listene eklendi." : ""} Şimdi video ekle.`,
      );
      router.push(`${basePath}/${result.data.id}`);
      router.refresh();
    });
  }

  function pickExisting(item: CatalogTitle) {
    if (audience === "coach") {
      router.push(`${basePath}/${item.id}`);
      return;
    }
    startTransition(async () => {
      const result = await selfAssignPlaylist({ id: item.id });
      if (!result.ok) return fail(result.error);
      toast.success(item.assigned ? "Bu liste zaten sende." : "Liste sana eklendi.");
      router.push(`${basePath}/${item.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5" noValidate>
      {editing ? null : (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Liste türü">
          <Chip
            selected={mode === "import"}
            onClick={() => setMode("import")}
            disabled={!options.canImport}
          >
            YouTube listesi
          </Chip>
          <Chip selected={mode === "manual"} onClick={() => setMode("manual")}>
            Elle liste kur
          </Chip>
        </div>
      )}

      {!editing && mode === "import" ? (
        <div>
          <Label htmlFor="playlist-url">YouTube oynatma listesi bağlantısı</Label>
          <Input
            id="playlist-url"
            inputMode="url"
            placeholder="https://www.youtube.com/playlist?list=…"
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={!!errors.url}
          />
          <FieldError message={errors.url} />
          <p className="mt-1 text-micro-lg text-ink-500">
            Başlık, süre ve sıra YouTube&apos;dan alınır (en fazla 200 video). Liste herkese açık ya
            da liste dışı olmalı.
          </p>
        </div>
      ) : null}

      {!options.canImport && !editing ? (
        <p className="flex items-start gap-2 rounded-sm border border-line bg-bg-surface p-3 text-small text-ink-700 clay:rounded-card clay:border-0 clay:clay-sm">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            YouTube API anahtarı tanımlı değil; listeyi elle kurup videoları bağlantıyla tek tek
            ekleyebilirsin.
          </span>
        </p>
      ) : null}

      {editing || mode === "manual" ? (
        <div>
          <Label htmlFor="playlist-title">Liste adı</Label>
          <Input
            id="playlist-title"
            maxLength={120}
            placeholder="ör. Matematik Video Dersleri"
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!!errors.title}
          />
          <FieldError message={errors.title} />
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div
          data-testid="playlist-suggestions"
          className="flex flex-col gap-2 rounded-sm border border-line bg-bg-surface p-3 text-small clay:rounded-card clay:border-0 clay:clay-sm"
        >
          <p className="font-medium text-ink-900">Bunu mu demek istedin?</p>
          <ul className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-ink-700">
                  {s.title}
                  {s.channelName ? ` · ${s.channelName}` : ""}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => pickExisting(s)}
                >
                  {audience === "student" ? (s.assigned ? "Aç" : "Seç") : "Aç"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {editing ? (
        <div>
          <Label htmlFor="playlist-channel">Kanal (isteğe bağlı)</Label>
          <Input
            id="playlist-channel"
            maxLength={80}
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />
        </div>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-small font-medium text-ink-700">Ders</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ders">
          {options.subjects.map((s) => (
            <Chip
              key={s.subjectId}
              selected={subjectId === s.subjectId}
              onClick={() => setSubjectId(s.subjectId)}
            >
              {s.shortName}
            </Chip>
          ))}
          <Chip selected={subjectId === null} onClick={() => setSubjectId(null)}>
            Karışık
          </Chip>
        </div>
        <p className="mt-1 text-micro-lg text-ink-500">
          Konuya eşleme kayıttan sonra; karışık listede videolar herhangi bir dersin konusuna
          eşlenir.
        </p>
      </fieldset>

      <FormError message={formError} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? mode === "import" && !editing
              ? "YouTube'dan alınıyor…"
              : "Kaydediliyor…"
            : editing
              ? "Kaydet"
              : mode === "import"
                ? "İçe aktar"
                : "Listeyi kur"}
        </Button>
        <Button type="button" variant="secondary" asChild>
          <Link href={editing ? `${basePath}/${playlist.id}` : basePath}>Vazgeç</Link>
        </Button>
      </div>
    </form>
  );
}

function Chip({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[38px] items-center rounded-xs border px-3 text-small font-medium pointer-coarse:min-h-11",
        selected
          ? "border-ink-900 bg-bg-surface text-ink-900"
          : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
        "disabled:cursor-not-allowed disabled:text-ink-300",
        "clay:min-h-11 clay:clay-press clay:rounded-md clay:border-0 clay:px-4",
        selected ? "clay:clay-pressed" : "clay:clay-sm",
      )}
    >
      {children}
    </button>
  );
}
