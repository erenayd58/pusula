"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CalendarPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postponedCount, weekTotals } from "../lib/plan-summary";
import { addPlanItems, movePlanItem, publishPlan } from "../server/actions";
import type { PlanItem, TaskPoolCategory, TaskPoolItem, WeekPlan } from "../types";
import { CoachMessageForm } from "./coach-message-form";
import { CopyPlanDialog, type CopyDialogState, type CopyTarget } from "./copy-plan-dialog";
import { DayColumn, columnId, dayFromColumnId, type DayHeaderInfo } from "./day-column";
import { PlanHeader } from "./plan-header";
import { PlanItemForm, type PlanItemFormState, type PlanOptions } from "./plan-item-form";
import { PlanItemMenu } from "./plan-item-menu";
import { PreparePlanButton } from "./prepare-plan-button";
import { POOL_PREFIX, TaskPool } from "./task-pool";

const DAYS: (number | null)[] = [1, 2, 3, 4, 5, 6, 7, null];
/** Havuz açık/kapalı tercihi (cihazda, localStorage; ilk açılış kapalı). */
const POOL_OPEN_KEY = "pusula.plan-pool-open";
const POOL_EVENT = "pusula:plan-pool";

function readPoolOpen() {
  try {
    return localStorage.getItem(POOL_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}
function usePoolOpen() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(POOL_EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(POOL_EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    readPoolOpen,
    () => false,
  );
}
function togglePool() {
  try {
    localStorage.setItem(POOL_OPEN_KEY, readPoolOpen() ? "0" : "1");
  } catch {
    // Depolama kapalıysa tercih tutulamaz; havuz kapalı kalır.
  }
  window.dispatchEvent(new Event(POOL_EVENT));
}

/** < 768 px salt okunur (04 §8.4); sunucu ve ilk istemci render'ı aynı (false) olsun. */
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
}

export type PlanBuilderProps = {
  studentId: string;
  studentName: string;
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  basePath: string;
  plan: WeekPlan | null;
  days: DayHeaderInfo[];
  options: PlanOptions;
  pool: TaskPoolCategory[];
  /** Kopyalama hedefleri: koçun diğer öğrencileri ve o haftadaki mevcut görev sayıları. */
  otherStudents: CopyTarget[];
  /** Geçen haftanın planı (varsa): kaynak kimliği ve görev sayısı. */
  lastWeekPlan: { id: string; items: number } | null;
  /** Gelecek haftada mevcut görev sayısı (aktarma onayı için). */
  nextWeekExisting: number;
};

/**
 * K3 plan oluşturucu (08 §2 Parça 2): sol havuz (1440 px altında daraltılabilir), 7 gün +
 * "Bu hafta içinde" sütunu (1280 px altında yatay kayar), dnd-kit (fare + klavye), formlar ve
 * kopyalama diyalogları. Her değişiklik anında Server Action ile yazılır (otomatik kayıt).
 */
export function PlanBuilder(props: PlanBuilderProps) {
  const { studentId, weekStart, plan, days, options, pool } = props;
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const readOnly = !isDesktop;
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<PlanItem[]>(plan?.items ?? []);
  const poolOpen = usePoolOpen();
  const [form, setForm] = useState<PlanItemFormState>(null);
  const [menuItem, setMenuItem] = useState<PlanItem | null>(null);
  const [copy, setCopy] = useState<CopyDialogState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byDay = new Map<string, PlanItem[]>();
  for (const d of DAYS) byDay.set(columnId(d), []);
  for (const i of items) byDay.get(columnId(i.dayOfWeek))?.push(i);
  const totals = weekTotals(
    items.map((i) => ({
      ...i,
      questions: i.targetUnit === "questions" ? i.targetValue : null,
    })),
  );
  const hasItems = items.length > 0;
  const self: CopyTarget = {
    studentId,
    fullName: props.studentName,
    existingItems: items.length,
  };

  function resolveTarget(overId: string): { day: number | null; index: number } | null {
    const direct = dayFromColumnId(overId);
    if (direct !== undefined) return { day: direct, index: byDay.get(overId)?.length ?? 0 };
    const target = items.find((i) => i.id === overId);
    if (!target) return null;
    const list = byDay.get(columnId(target.dayOfWeek)) ?? [];
    return { day: target.dayOfWeek, index: list.findIndex((i) => i.id === overId) };
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const target = resolveTarget(String(over.id));
    if (!target) return;

    // Havuzdan güne bırakma → yeni görev.
    if (activeId.startsWith(POOL_PREFIX)) {
      const preset = active.data.current?.pool as TaskPoolItem | undefined;
      if (!preset) return;
      startTransition(async () => {
        const result = await addPlanItems({
          studentId,
          weekStart,
          days: [target.day],
          kind: preset.kind,
          title: preset.title,
          subjectId: preset.subjectId,
          topicId: preset.topicId,
          url: preset.url ?? "",
          targetValue: preset.targetValue,
          targetUnit: preset.targetUnit,
          estimatedMinutes: preset.estimatedMinutes,
          sectionId: preset.sectionId ?? null,
          videoId: preset.videoId ?? null,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Görev eklendi.");
        router.refresh();
      });
      return;
    }

    const moving = items.find((i) => i.id === activeId);
    if (!moving) return;
    if (moving.dayOfWeek === target.day && activeId === String(over.id)) return;

    // İyimser yerleşim: hedef listede yeni konum.
    const sourceList = (byDay.get(columnId(moving.dayOfWeek)) ?? []).filter(
      (i) => i.id !== activeId,
    );
    const targetList =
      moving.dayOfWeek === target.day
        ? sourceList
        : (byDay.get(columnId(target.day)) ?? []).filter((i) => i.id !== activeId);
    const index = Math.min(target.index, targetList.length);
    const nextTarget = [...targetList];
    nextTarget.splice(index, 0, { ...moving, dayOfWeek: target.day });
    const untouched = items.filter(
      (i) => i.id !== activeId && i.dayOfWeek !== moving.dayOfWeek && i.dayOfWeek !== target.day,
    );
    const renumber = (list: PlanItem[]) => list.map((i, sortOrder) => ({ ...i, sortOrder }));
    setItems(
      moving.dayOfWeek === target.day
        ? [...untouched, ...renumber(nextTarget)]
        : [...untouched, ...renumber(sourceList), ...renumber(nextTarget)],
    );

    startTransition(async () => {
      const result = await movePlanItem({ id: activeId, studentId, dayOfWeek: target.day, index });
      if (!result.ok) {
        toast.error(result.error);
        setItems(plan?.items ?? []);
        return;
      }
      router.refresh();
    });
  }

  function publish() {
    startTransition(async () => {
      const result = await publishPlan({ studentId, weekStart });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Plan yayınlandı.");
      router.refresh();
    });
  }

  function openCopyLastWeek() {
    if (!props.lastWeekPlan) {
      toast("Geçen haftanın planı yok.");
      return;
    }
    setCopy({
      mode: "last-week",
      sourcePlanId: props.lastWeekPlan.id,
      weekStart,
      sourceItems: props.lastWeekPlan.items,
      target: self,
    });
  }

  function openCopyToOthers() {
    if (!plan) return;
    setCopy({
      mode: "others",
      sourcePlanId: plan.id,
      weekStart,
      sourceItems: items.length,
      targets: props.otherStudents,
    });
  }

  function openCarryOver() {
    if (!plan) return;
    const incomplete = items.filter((i) => i.completedAt === null).length;
    setCopy({
      mode: "carry-over",
      sourcePlanId: plan.id,
      weekStart: props.nextWeek,
      sourceItems: incomplete,
      target: { ...self, existingItems: props.nextWeekExisting },
    });
  }

  const dayInfo = (day: number | null) => (day === null ? null : (days[day - 1] ?? null));

  return (
    <div className="flex flex-col gap-4">
      <PlanHeader
        studentName={props.studentName}
        weekStart={weekStart}
        prevWeek={props.prevWeek}
        nextWeek={props.nextWeek}
        basePath={props.basePath}
        status={plan?.status ?? null}
        lastSavedAt={plan?.updatedAt ?? null}
        totals={totals}
        postponed={postponedCount(items)}
        readOnly={readOnly}
        hasItems={hasItems}
        pending={pending}
        poolOpen={poolOpen}
        onTogglePool={togglePool}
        onCopyLastWeek={openCopyLastWeek}
        onCopyToOthers={openCopyToOthers}
        onCarryOver={openCarryOver}
        onPublish={publish}
      />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className={cn("flex items-start gap-4 print:hidden", readOnly && "flex-col")}>
          {!readOnly && poolOpen ? (
            <div className="w-[320px] shrink-0">
              <TaskPool
                categories={pool}
                readOnly={readOnly}
                onAdd={(item) => setForm({ mode: "add", days: [null], preset: item })}
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            {!hasItems ? (
              <EmptyState
                icon={CalendarPlusIcon}
                title={plan ? "Bu hafta henüz görev yok" : "Bu hafta için plan yok"}
                description="Geçen haftayı kopyalayarak başlayın, önerilen planı hazırlayın ya da ilk görevi ekleyin. Havuzdan sürükleyerek de ekleyebilirsiniz."
                className="mb-4"
                action={
                  !readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={openCopyLastWeek}
                        disabled={pending || !props.lastWeekPlan}
                        title={props.lastWeekPlan ? undefined : "Geçen haftanın planı yok"}
                      >
                        Geçen haftayı kopyala
                      </Button>
                      <PreparePlanButton
                        studentId={studentId}
                        weekStart={weekStart}
                        disabled={pending || plan?.status === "published"}
                        disabledReason="Yayınlanmış plana öneriler tek tek eklenir"
                      />
                      <Button
                        type="button"
                        onClick={() => setForm({ mode: "add", days: [1] })}
                        disabled={pending}
                      >
                        İlk görevi ekle
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            ) : null}
            {/* Havuz kapalıyken 1440 px'te 8 sütun kaydırmasız sığar; açıkken yatay kayar. */}
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {DAYS.map((day) => (
                <DayColumn
                  key={String(day)}
                  day={day}
                  info={dayInfo(day)}
                  items={byDay.get(columnId(day)) ?? []}
                  readOnly={readOnly}
                  wide={poolOpen}
                  onAdd={(d) => setForm({ mode: "add", days: [d] })}
                  onMenu={setMenuItem}
                />
              ))}
            </div>
          </div>
        </div>
      </DndContext>

      {!readOnly ? (
        <section className="rounded-sm border border-line bg-bg-paper p-4 print:hidden">
          <CoachMessageForm
            studentId={studentId}
            weekStart={weekStart}
            initial={plan?.coachMessage ?? null}
          />
        </section>
      ) : null}

      {plan?.studentReflection ? (
        <section className="rounded-sm border border-line bg-bg-paper p-4 print:hidden">
          <h2 className="text-small font-semibold text-ink-900">Öğrencinin değerlendirmesi</h2>
          <p className="mt-1 text-small text-ink-700">“{plan.studentReflection}”</p>
        </section>
      ) : null}

      <PlanItemForm
        studentId={studentId}
        weekStart={weekStart}
        options={options}
        state={form}
        onOpenChange={(o) => !o && setForm(null)}
      />
      <PlanItemMenu
        item={menuItem}
        studentId={studentId}
        weekStart={weekStart}
        onOpenChange={(o) => !o && setMenuItem(null)}
        onEdit={(item) => setForm({ mode: "edit", item })}
      />
      <CopyPlanDialog state={copy} onOpenChange={(o) => !o && setCopy(null)} />
    </div>
  );
}
