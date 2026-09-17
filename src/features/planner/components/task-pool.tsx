"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVerticalIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { KIND_SPECS } from "../lib/kinds";
import { filterPool } from "../lib/pool";
import type { TaskPoolCategory, TaskPoolItem } from "../types";

export const POOL_PREFIX = "pool:";

/**
 * Görev havuzu (K3 sol panel, 08 §3.1): kategori başlıkları, arama, sürüklenebilir öğe ve
 * "Güne ekle" düğmesi (formu ön dolu açar). Boş kategoriler açıklamalarıyla görünür.
 */
export function TaskPool({
  categories,
  readOnly,
  onAdd,
}: {
  categories: TaskPoolCategory[];
  readOnly: boolean;
  onAdd: (item: TaskPoolItem) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = filterPool(categories, query);

  return (
    <aside
      aria-label="Görev havuzu"
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-3"
    >
      <label className="relative block">
        <span className="sr-only">Görev ara</span>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-300"
        />
        <Input
          type="search"
          placeholder="Konu veya görev ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </label>
      {visible.map((c) => (
        <section key={c.id} aria-labelledby={`pool-${c.id}`} className="flex flex-col gap-1.5">
          <h3
            id={`pool-${c.id}`}
            className="flex items-baseline gap-2 text-small font-semibold text-ink-900"
          >
            {c.title}
            <span className="text-micro-lg font-normal text-ink-500">{c.items.length || ""}</span>
          </h3>
          {c.items.length === 0 ? (
            <p className="text-micro-lg text-ink-500">
              {query ? "Eşleşen görev yok." : c.emptyText}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {c.items.map((item) => (
                <PoolItem key={item.key} item={item} readOnly={readOnly} onAdd={onAdd} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </aside>
  );
}

function PoolItem({
  item,
  readOnly,
  onAdd,
}: {
  item: TaskPoolItem;
  readOnly: boolean;
  onAdd: (item: TaskPoolItem) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `${POOL_PREFIX}${item.key}`,
    data: { pool: item },
    disabled: readOnly,
  });
  const Icon = KIND_SPECS[item.kind].icon;

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-1 rounded-xs border border-line bg-bg-surface pr-1",
        isDragging && "opacity-50",
      )}
    >
      {!readOnly ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={`Sürükle: ${item.title}`}
          className="flex size-8 shrink-0 cursor-grab items-center justify-center text-ink-300 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <span className="flex min-w-0 flex-1 flex-col py-1.5">
        <span className="flex items-center gap-1.5 text-small text-ink-900">
          <Icon aria-hidden="true" className="size-3.5 shrink-0 text-ink-500" />
          <span className="truncate">{item.title}</span>
        </span>
        <span className="text-micro-lg text-ink-500">
          {item.reason ? `${item.reason} · ` : ""}
          {formatDuration(item.estimatedMinutes)}
        </span>
      </span>
      {!readOnly ? (
        <button
          type="button"
          aria-label={`Güne ekle: ${item.title}`}
          onClick={() => onAdd(item)}
          className="flex size-8 shrink-0 items-center justify-center rounded-xs text-ink-700 hover:bg-bg-paper focus-visible:outline-2 focus-visible:outline-focus"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </li>
  );
}
