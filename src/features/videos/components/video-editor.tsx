"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { NativeSelect } from "@/components/shared/native-select";
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
import { formatCount, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addVideoSchema, updateVideoSchema } from "../schemas";
import {
  addVideo,
  deleteVideo,
  refreshPlaylist,
  setVideoTopics,
  updateVideo,
} from "../server/actions";
import type { PlaylistDetail, Video, VideoOptions } from "../types";

/** Listenin (varsa) dersine göre konu seçenekleri; karışık listede tüm dersler (optgroup). */
function topicGroups(options: VideoOptions, subjectId: string | null) {
  const subjects = subjectId
    ? options.subjects.filter((s) => s.subjectId === subjectId)
    : options.subjects;
  return subjects.map((s) => ({ label: s.name, topics: s.topics }));
}

function TopicOptions({ groups }: { groups: ReturnType<typeof topicGroups> }) {
  if (groups.length === 1) {
    return (
      <>
        {groups[0]!.topics.map((t) => (
          <option key={t.topicId} value={t.topicId}>
            {t.name}
          </option>
        ))}
      </>
    );
  }
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.topics.map((t) => (
            <option key={t.topicId} value={t.topicId}>
              {t.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

/**
 * Video editörü (11 §2 Parça 2): satır = onay kutusu · sıra · başlık · süre · konu · düzenle;
 * çoklu seçim → "Konuya eşle"; "Video ekle" (bağlantı + isteğe bağlı başlık); YouTube listesinde
 * "Listeyi yenile". Küçük resim yok (D15). Koç kataloğu ve öğrencinin özel listesi aynı bileşen.
 */
export function VideoEditor({
  playlist,
  options,
}: {
  playlist: PlaylistDetail;
  options: VideoOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<Video | null>(null);
  const [adding, setAdding] = useState(false);
  const [mapTopic, setMapTopic] = useState("");
  const videos = playlist.videos;
  const groups = topicGroups(options, playlist.subjectId);
  const allSelected = videos.length > 0 && selected.size === videos.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyTopic() {
    const topicId = mapTopic === "" ? null : mapTopic;
    const label = groups.flatMap((g) => g.topics).find((t) => t.topicId === topicId)?.name;
    startTransition(async () => {
      const result = await setVideoTopics({
        playlistId: playlist.id,
        videoIds: [...selected],
        topicId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        topicId
          ? `${formatCount(selected.size, "video")} “${label ?? "konu"}” konusuna eşlendi.`
          : `${formatCount(selected.size, "video")} konu eşlemesi kaldırıldı.`,
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  function removeSelected() {
    if (!window.confirm(`${formatCount(selected.size, "video")} listeden silinsin mi?`)) return;
    startTransition(async () => {
      for (const id of selected) {
        const result = await deleteVideo({ id, playlistId: playlist.id });
        if (!result.ok) {
          toast.error(result.error);
          break;
        }
      }
      toast.success("Videolar silindi.");
      setSelected(new Set());
      router.refresh();
    });
  }

  function refresh() {
    startTransition(async () => {
      const result = await refreshPlaylist({ id: playlist.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Liste yenilendi: ${result.data.message}`);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="video-editor-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="video-editor-heading" className="text-heading font-semibold text-ink-900">
          {`Videolar · ${formatCount(videos.length, "video")}`}
        </h2>
        <div className="flex flex-wrap gap-2">
          {playlist.youtubePlaylistId ? (
            <Button
              type="button"
              variant="secondary"
              onClick={refresh}
              disabled={pending || !options.canImport}
            >
              <RefreshCwIcon aria-hidden="true" />
              Listeyi yenile
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
            <PlusIcon aria-hidden="true" />
            Video ekle
          </Button>
        </div>
      </div>

      {selected.size > 0 ? (
        <div
          data-testid="video-bulk-bar"
          className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-bg-surface p-2 text-small clay:rounded-card clay:border-0 clay:clay-sm"
        >
          <span className="px-2 text-ink-700">{`${formatCount(selected.size, "video")} seçili`}</span>
          <Label htmlFor="video-map-topic" className="sr-only">
            Konu
          </Label>
          <NativeSelect
            id="video-map-topic"
            value={mapTopic}
            onChange={(e) => setMapTopic(e.target.value)}
            className="w-auto min-w-48 flex-1 sm:flex-none"
          >
            <option value="">Konu eşlemesini kaldır</option>
            <TopicOptions groups={groups} />
          </NativeSelect>
          <Button type="button" onClick={applyTopic} disabled={pending}>
            Konuya eşle
          </Button>
          <Button type="button" variant="secondary" onClick={removeSelected} disabled={pending}>
            <Trash2Icon aria-hidden="true" />
            Sil
          </Button>
        </div>
      ) : null}

      {videos.length === 0 ? (
        <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700 clay:rounded-card clay:border-0 clay:clay-sm">
          Bu listede henüz video yok. “Video ekle” ile bir YouTube bağlantısı yapıştır.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm">
          <table className="w-full text-small" data-testid="video-table">
            <thead className="text-left text-micro-lg text-ink-500">
              <tr className="border-b border-line">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-ink-900"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(videos.map((v) => v.id)))
                    }
                    aria-label="Tümünü seç"
                  />
                </th>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Video</th>
                <th className="px-3 py-2 text-right font-medium">Süre</th>
                <th className="px-3 py-2 font-medium">Konu</th>
                <th className="px-3 py-2 text-right font-medium">Eylemler</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v, index) => (
                <tr
                  key={v.id}
                  data-testid="video-row"
                  className={cn(
                    "border-b border-line last:border-b-0",
                    selected.has(v.id) && "bg-bg-surface",
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-ink-900"
                      checked={selected.has(v.id)}
                      onChange={() => toggle(v.id)}
                      aria-label={`${v.title} seç`}
                    />
                  </td>
                  <td className="px-3 py-2 text-ink-500 tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2 font-medium text-ink-900">{v.title}</td>
                  <td className="px-3 py-2 text-right text-ink-700 tabular-nums">
                    {v.durationSeconds ? formatDuration(v.durationSeconds / 60) : "—"}
                  </td>
                  <td className="px-3 py-2 text-ink-700">{v.topicName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${v.title} düzenle`}
                        onClick={() => setEditing(v)}
                      >
                        <PencilIcon aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ResponsiveSheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <ResponsiveSheetContent className="sm:max-w-md">
          {editing ? (
            <VideoFields
              key={editing.id}
              playlist={playlist}
              groups={groups}
              video={editing}
              onOpenChange={(o) => !o && setEditing(null)}
            />
          ) : null}
        </ResponsiveSheetContent>
      </ResponsiveSheet>
      <ResponsiveSheet open={adding} onOpenChange={setAdding}>
        <ResponsiveSheetContent className="sm:max-w-md">
          {adding ? (
            <AddVideoFields
              playlist={playlist}
              groups={groups}
              options={options}
              onOpenChange={setAdding}
            />
          ) : null}
        </ResponsiveSheetContent>
      </ResponsiveSheet>
    </section>
  );
}

function VideoFields({
  playlist,
  groups,
  video,
  onOpenChange,
}: {
  playlist: PlaylistDetail;
  groups: ReturnType<typeof topicGroups>;
  video: Video;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const [title, setTitle] = useState(video.title);
  const [topicId, setTopicId] = useState(video.topicId ?? "");
  const [minutes, setMinutes] = useState(
    video.durationSeconds ? String(Math.max(1, Math.round(video.durationSeconds / 60))) : "",
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = updateVideoSchema.safeParse({
      id: video.id,
      playlistId: playlist.id,
      title,
      topicId: topicId === "" ? null : topicId,
      durationMinutes: minutes.trim() === "" ? null : Number(minutes),
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Formu kontrol et.");
      return;
    }
    startTransition(async () => {
      const result = await updateVideo(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success("Video güncellendi.");
      onOpenChange(false);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`“${video.title}” listeden silinsin mi?`)) return;
    startTransition(async () => {
      const result = await deleteVideo({ id: video.id, playlistId: playlist.id });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success("Video silindi.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>Videoyu düzenle</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>{`youtube.com/watch?v=${video.youtubeVideoId}`}</ResponsiveSheetDescription>
      </ResponsiveSheetHeader>
      <div>
        <Label htmlFor="video-title">Başlık</Label>
        <Input
          id="video-title"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="video-topic">Konu</Label>
          <NativeSelect
            id="video-topic"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
          >
            <option value="">Konu eşlemesi yok</option>
            <TopicOptions groups={groups} />
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="video-minutes">Süre (dk)</Label>
          <Input
            id="video-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
      </div>
      <FormError message={formError} />
      <ResponsiveSheetFooter>
        <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
          <Trash2Icon aria-hidden="true" />
          Sil
        </Button>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </ResponsiveSheetFooter>
    </form>
  );
}

function AddVideoFields({
  playlist,
  groups,
  options,
  onOpenChange,
}: {
  playlist: PlaylistDetail;
  groups: ReturnType<typeof topicGroups>;
  options: VideoOptions;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const [urlError, setUrlError] = useState<string>();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    setUrlError(undefined);
    const parsed = addVideoSchema.safeParse({
      playlistId: playlist.id,
      url,
      title,
      topicId: topicId === "" ? null : topicId,
    });
    if (!parsed.success) {
      setUrlError(parsed.error.issues[0]?.message);
      return;
    }
    if (!options.canImport && !parsed.data.title) {
      setFormError("YouTube anahtarı tanımlı değil; video başlığını yaz.");
      return;
    }
    startTransition(async () => {
      const result = await addVideo(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(`“${result.data.title}” eklendi.`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>Video ekle</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          {options.canImport
            ? "Bağlantıyı yapıştır; başlık ve süre YouTube'dan alınır (istersen başlığı kendin yaz)."
            : "YouTube anahtarı yok: bağlantı ve başlık gerekli; süre isteğe bağlı olarak düzenlemeden girilir."}
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>
      <div>
        <Label htmlFor="add-video-url">YouTube bağlantısı</Label>
        <Input
          id="add-video-url"
          inputMode="url"
          placeholder="https://youtu.be/…"
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={!!urlError}
        />
        <FieldError message={urlError} />
      </div>
      <div>
        <Label htmlFor="add-video-title">Başlık{options.canImport ? " (isteğe bağlı)" : ""}</Label>
        <Input
          id="add-video-title"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="add-video-topic">Konu (isteğe bağlı)</Label>
        <NativeSelect
          id="add-video-topic"
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
        >
          <option value="">Konu eşlemesi yok</option>
          <TopicOptions groups={groups} />
        </NativeSelect>
      </div>
      <FormError message={formError} />
      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Ekleniyor…" : "Ekle"}
        </Button>
      </ResponsiveSheetFooter>
    </form>
  );
}
