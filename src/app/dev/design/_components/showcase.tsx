import { AlertCircleIcon, AlertTriangleIcon, CheckIcon } from "lucide-react";
import { SurfaceRoot, type Surface } from "@/components/layout/surface-root";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { SubjectStripe } from "@/components/shared/subject-stripe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { subjects, upcoming } from "../_data";
import { Note, Section } from "./primitives";

/*
 * Aynı bileşen kodu iki yüzeyde: solda öğrenci (clay), sağda koç (flat).
 * Sütunlar kendi SurfaceRoot'unu taşır; sayfanın kendisi yüzeysizdir.
 */
function Column({
  surface,
  title,
  children,
}: {
  surface: Surface;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SurfaceRoot
      surface={surface}
      data-testid={`column-${surface}`}
      className={cn(
        "min-h-0 gap-8 p-6",
        surface === "flat"
          ? "rounded-sm border border-line bg-bg-paper"
          : "rounded-lg bg-bg-surface",
      )}
    >
      <p className="text-small text-ink-500">{title}</p>
      {children}
    </SurfaceRoot>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3.5 text-small font-semibold text-ink-700">{title}</h3>
      {children}
    </div>
  );
}

function Buttons({ surface }: { surface: Surface }) {
  const labels =
    surface === "flat"
      ? { primary: "Planı yayınla", secondary: "Şablondan başlat", ghost: "Öğrenci ekle" }
      : { primary: "Kaydet", secondary: "Vazgeç", ghost: "Tümünü gör" };
  return (
    <Block title="Düğmeler · primary, secondary, ghost, devre dışı">
      <div className="flex flex-wrap items-center gap-3.5">
        <Button data-testid={`button-primary-${surface}`}>{labels.primary}</Button>
        <Button variant="secondary">{labels.secondary}</Button>
        <Button variant="ghost">{labels.ghost}</Button>
        <Button disabled>{labels.primary}</Button>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-3.5">
        <Button className="clay:clay-pressed">basılı</Button>
        <Button className="outline-3 outline-offset-3 outline-focus outline-solid">odak</Button>
        <span className="text-small text-ink-500">
          basılı (statik) · klavye odağı · Tab ile gerçek odak halkasını dene
        </span>
      </div>
      {surface === "flat" ? (
        <Note>
          Koç düğmesi görsel olarak 38 px; dokunmatik cihazlarda (<code>pointer-coarse</code>) en az
          44 px. Ghost düğme mavi değil <code>--ink-700</code> (ders rengi sadece dersi temsil
          eder).
        </Note>
      ) : (
        <Note>Basılı durumda gölge içe döner, öğe %3 küçülür, 120 ms. 48 px dokunma hedefi.</Note>
      )}
    </Block>
  );
}

function Form({ surface }: { surface: Surface }) {
  return (
    <Block title="Metin girişi ve etiket">
      <div className="flex max-w-105 flex-col gap-3.5">
        <div>
          <Label htmlFor={`topic-${surface}`}>{surface === "flat" ? "Öğrenci ara" : "Konu"}</Label>
          <Input
            id={`topic-${surface}`}
            data-testid={`input-${surface}`}
            defaultValue={surface === "flat" ? "Elif" : "Üslü İfadeler"}
          />
        </div>
        <div>
          <Label htmlFor={`search-${surface}`}>Boş durum</Label>
          <Input id={`search-${surface}`} placeholder="Konu ara" />
        </div>
        <div>
          <Label htmlFor={`disabled-${surface}`}>Devre dışı</Label>
          <Input id={`disabled-${surface}`} disabled defaultValue="Kilitli alan" />
        </div>
      </div>
      {surface !== "flat" ? (
        <Note>Alanın içi düz kalır (kuyu); clay olan kaptır. Odak halkası her zaman görünür.</Note>
      ) : null}
    </Block>
  );
}

function Subjects() {
  return (
    <Block title="Ders rozeti ve ders şeridi">
      <div className="flex flex-wrap gap-2.5">
        {subjects.map((s) => (
          <SubjectBadge key={s.color} color={s.color} shortName={s.shortName} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3.5">
        <Card
          elevation="sm"
          style={subjectVars("subject-math")}
          className="min-w-58 flex-1 flex-row gap-0 overflow-hidden p-0 clay:p-0"
        >
          <SubjectStripe />
          <div className="px-4 py-3.5 clay:px-4 clay:py-3.5">
            <div className="text-body font-semibold">Üslü İfadeler</div>
            <div className="mt-1 text-small text-ink-500">Matematik · 40 soru</div>
          </div>
        </Card>
        <Card
          elevation="sm"
          className="min-w-58 flex-1 flex-row gap-0 overflow-hidden p-0 clay:p-0"
        >
          <SubjectStripe color="subject-sci" />
          <div className="px-4 py-3.5">
            <div className="text-body font-semibold">Basınç</div>
            <div className="mt-1 text-small text-ink-500">Fen Bilimleri · Video 3-5</div>
          </div>
        </Card>
      </div>
      <Note>
        Rozet metni koyu ders tonunda (-ink) soft zemin üzerinde. Tam renk yalnızca şerit, dolgu ve
        grafikte.
      </Note>
    </Block>
  );
}

function Badges({ surface }: { surface: Surface }) {
  return (
    <Block title="Rozet tonları">
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge>Nötr</Badge>
        <Badge tone="success">
          <CheckIcon aria-hidden="true" /> Kaydedildi
        </Badge>
        {surface === "flat" ? (
          <Badge tone="warning">
            <AlertTriangleIcon aria-hidden="true" /> 4 gündür kayıt yok
          </Badge>
        ) : null}
        <Badge tone="error">
          <AlertCircleIcon aria-hidden="true" /> Kaydedilemedi
        </Badge>
      </div>
      <Note>
        {surface === "flat"
          ? "Uyarı rengi yalnızca koç ekranlarında. Hata her zaman ikon + metin."
          : "Öğrenci ve veli ekranlarında uyarı rengi yok; hata yalnızca sistem hatası için, ikonla."}
      </Note>
    </Block>
  );
}

function Cards({ surface }: { surface: Surface }) {
  const elevations = surface === "flat" ? (["md"] as const) : (["sm", "md", "lg"] as const);
  return (
    <Block title={surface === "flat" ? "Kart" : "Kart · clay-sm, clay-md, clay-lg"}>
      <div className="grid gap-4 sm:grid-cols-3">
        {elevations.map((e) => (
          <Card key={e} elevation={e} data-testid={`card-${e}-${surface}`}>
            <CardHeader>
              <CardTitle>Bu hafta</CardTitle>
              <CardDescription>
                {surface === "flat" ? "1 px kenarlık, gölge yok" : `elevation="${e}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>420 soru · 14 sa 20 dk</CardContent>
          </Card>
        ))}
      </div>
    </Block>
  );
}

function DialogDemo({ surface }: { surface: Surface }) {
  return (
    <Block title="Diyalog">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary" data-testid={`dialog-trigger-${surface}`}>
            Diyaloğu aç
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {surface === "flat" ? "Planı 3 öğrenciye kopyala" : "Soru kaydı"}
            </DialogTitle>
            <DialogDescription>
              {surface === "flat"
                ? "Seçili öğrencilere bu haftanın planı taslak olarak kopyalanır."
                : "Ders ve konu son kaydından hazır geldi; sadece sayıları gir."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor={`dialog-input-${surface}`}>
              {surface === "flat" ? "Hafta" : "Doğru"}
            </Label>
            <Input
              id={`dialog-input-${surface}`}
              defaultValue={surface === "flat" ? "21 – 27 Eylül 2026" : "32"}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost">Vazgeç</Button>
            <Button>{surface === "flat" ? "Kopyala" : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Note>
        Portal ile body&apos;ye çıkar; <code>data-surface</code> özniteliğini{" "}
        <code>useSurface()</code> ile kendi üzerine koyar.
      </Note>
    </Block>
  );
}

function CalmDemo() {
  return (
    <SurfaceRoot
      surface="clay-calm"
      className="min-h-0 gap-4 rounded-lg bg-bg-surface p-6"
      data-testid="column-clay-calm"
    >
      <p className="text-small text-ink-500">
        Veli · clay-calm: aynı öğede clay: ve calm:, calm kazanır
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div data-testid="calm-card" className="rounded-card p-5 clay:clay-md calm:clay-sm">
          <div className="text-small text-ink-500">Sınıf: clay:clay-md calm:clay-sm</div>
          <div className="mt-1 text-body font-semibold">Gölge: clay-sm (4px 4px 10px)</div>
        </div>
        <Card elevation="lg" data-testid="calm-card-component">
          <CardHeader>
            <CardTitle>Card elevation=&quot;lg&quot;</CardTitle>
            <CardDescription>Veli yüzeyinde yine clay-sm</CardDescription>
          </CardHeader>
          <CardContent>Elif bu hafta planının %80&apos;ini tamamladı.</CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button>Haftalık özeti aç</Button>
        <SubjectBadge color="subject-tr" shortName="Tür" />
      </div>
    </SurfaceRoot>
  );
}

export function ComponentsSection() {
  return (
    <Section
      number="6"
      title="Bileşenler"
      note="Solda öğrenci (clay), sağda koç (sade) varyantı. Aynı bileşen, farklı data-surface."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {(["clay", "flat"] as const).map((surface) => (
          <Column
            key={surface}
            surface={surface}
            title={
              surface === "clay" ? 'Öğrenci · data-surface="clay"' : 'Koç · data-surface="flat"'
            }
          >
            <Buttons surface={surface} />
            <Form surface={surface} />
            <Subjects />
            <Badges surface={surface} />
            <Cards surface={surface} />
            <DialogDemo surface={surface} />
          </Column>
        ))}
      </div>
      <div className="mt-5">
        <CalmDemo />
      </div>
      <div className="mt-8 rounded-sm border border-line bg-bg-paper p-5">
        <h3 className="mb-2 text-small font-semibold text-ink-700">Bu sayfada henüz olmayanlar</h3>
        <ul className="grid gap-x-8 gap-y-1.5 text-small text-ink-700 sm:grid-cols-2">
          {upcoming.map((u) => (
            <li key={u.name} className="flex justify-between gap-4 border-b border-line py-1.5">
              <span>{u.name}</span>
              <span className="shrink-0 text-ink-500">{u.phase}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
