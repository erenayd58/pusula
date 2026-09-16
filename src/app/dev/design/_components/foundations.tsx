import { AlertCircleIcon, AlertTriangleIcon, CheckIcon, MonitorIcon } from "lucide-react";
import { SurfaceRoot } from "@/components/layout/surface-root";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatNet, formatPercent, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import { basePalette, radii, reserveSubjects, spacing, subjects, typeScale } from "../_data";
import { Note, Panel, Section, Token } from "./primitives";

export function ColorsSection() {
  return (
    <Section
      number="1"
      title="Renkler"
      note="Ders rengi hiçbir zaman tek başına bilgi taşımaz; her zaman kısa ad ya da ikonla birlikte gelir."
    >
      <h3 className="mb-3.5 text-heading font-semibold">Temel palet</h3>
      <div className="mb-9 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {basePalette.map((c) => (
          <div key={c.token} className="flex flex-col gap-2">
            <div
              className="h-16 rounded-md border border-ink-900/5 shadow-[var(--clay-inner)]"
              style={{ background: `var(${c.token})` }}
            />
            <div className="text-small font-medium">{c.name}</div>
            <Token>{c.token}</Token>
          </div>
        ))}
      </div>

      <h3 className="mb-3.5 text-heading font-semibold">Ders renkleri ve soft tonları</h3>
      <SurfaceRoot
        surface="clay"
        className="mb-7 grid min-h-0 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 bg-transparent"
      >
        {subjects.map((s) => (
          <div
            key={s.color}
            style={subjectVars(s.color)}
            className="flex items-center gap-3.5 rounded-card clay-sm px-4 py-3.5"
          >
            <div className="h-13 w-1.5 rounded-pill bg-subject" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SubjectBadge color={s.color} shortName={s.shortName} />
                <span className="text-small font-medium">{s.name}</span>
              </div>
              <div className="mt-1.5">
                <Token>--{s.color} · -soft · -ink</Token>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-5.5 w-8.5 rounded-[7px] bg-subject" />
              <div className="h-5.5 w-8.5 rounded-[7px] bg-subject-soft" />
            </div>
          </div>
        ))}
      </SurfaceRoot>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-5">
        <SurfaceRoot surface="clay" className="min-h-0 rounded-card clay-sm p-4.5">
          <h4 className="mb-3 text-small font-semibold">Yedek ders renkleri</h4>
          <div className="grid grid-cols-4 gap-2.5">
            {reserveSubjects.map((r) => (
              <div key={r.color} className="flex flex-col items-start gap-1.5">
                <div
                  className="h-11 w-full rounded-sm"
                  style={{ background: `var(--${r.color})` }}
                />
                <SubjectBadge color={r.color} shortName={r.shortName} />
              </div>
            ))}
          </div>
          <Note>
            Yeni ders eklendiğinde renkle birlikte kısa ad da atanır. Soft ve ink tonları{" "}
            <code>subjectVars()</code> içinde <code>color-mix</code> ile türetilir.
          </Note>
        </SurfaceRoot>

        <div className="rounded-card clay-sm p-4.5">
          <h4 className="mb-3 text-small font-semibold">Vurgu · fosforlu kalem</h4>
          <div className="flex h-11 items-center rounded-sm bg-marker px-3.5 text-small font-semibold text-ink-900">
            Görev tamamlandı
          </div>
          <div className="mt-1.5">
            <Token>--accent-marker · --accent-marker-soft</Token>
          </div>
          <Note>
            Yalnızca iki yerde: görev tamamlandığında ve günlük hedefe ulaşıldığında. Başka hiçbir
            yerde kullanılmaz.
          </Note>
        </div>

        <div className="rounded-card clay-sm p-4.5">
          <h4 className="mb-3 text-small font-semibold">Durum renkleri</h4>
          <div className="flex flex-col items-start gap-2">
            <Badge tone="success">
              <CheckIcon aria-hidden="true" /> Başarılı · --state-success
            </Badge>
            <Badge tone="warning">
              <AlertTriangleIcon aria-hidden="true" /> Uyarı (sadece koç) · --state-warning
            </Badge>
            <Badge tone="error">
              <AlertCircleIcon aria-hidden="true" /> Hata (sadece sistem) · --state-error
            </Badge>
          </div>
          <Note>
            Kırmızı sadece sistem hatası içindir ve her zaman ikon + metinle gelir. Düşük performans
            nötr dille anlatılır: &quot;180 soru kaldı&quot;.
          </Note>
        </div>
      </div>
    </Section>
  );
}

export function ClaySection() {
  const levels = [
    {
      name: "clay-sm",
      cls: "clay-sm rounded-card",
      token: "--clay-sm",
      use: "Ders rozeti, çip, liste kabı, veli özet kartı.",
    },
    {
      name: "clay-md",
      cls: "clay-md rounded-card",
      token: "--clay-md",
      use: "Görev kartı, ders kartı, birincil düğme, hedef halkası.",
    },
    {
      name: "clay-lg",
      cls: "clay-lg rounded-xl",
      token: "--clay-lg",
      use: "Alt panel, diyalog, hızlı kayıt düğmesi, yan menü.",
    },
  ] as const;

  return (
    <Section
      number="2"
      title="Clay yükseklik seviyeleri"
      note="Üç seviye, fazlası değil. Basılı durumda gölge içe döner ve öğe %3 küçülür (120 ms)."
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        {levels.map((l) => (
          <Panel key={l.name} variant="clay" className="py-7">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className={cn("h-21 flex-1 clay-press text-small font-semibold", l.cls)}
              >
                {l.name}
              </button>
              <div
                className={cn(
                  "grid h-21 flex-1 clay-pressed place-items-center bg-bg-raised text-small text-ink-500",
                  l.cls.replace(/clay-(sm|md|lg)/, ""),
                )}
              >
                basılı
              </div>
            </div>
            <div className="mt-4">
              <Token>{l.token}</Token>
            </div>
            <p className="mt-2.5 text-small text-ink-700">{l.use}</p>
          </Panel>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        <div className="rounded-card clay-sm p-5">
          <h4 className="mb-3 text-small font-semibold">Kuyu (içerik yüzeyi)</h4>
          <div className="grid h-16 place-items-center rounded-md clay-well text-small text-ink-700">
            Metin ve form içeriği burada düz durur
          </div>
          <div className="mt-3">
            <Token>--clay-well</Token>
          </div>
        </div>
        <div className="rounded-card clay-sm p-5">
          <h4 className="mb-3 text-small font-semibold">Koç tarafı: gölge sadece yüzen öğede</h4>
          <div className="flex gap-3">
            <div className="grid h-16 flex-1 place-items-center rounded-sm border border-line-strong bg-bg-paper text-small">
              kenarlık
            </div>
            <div className="grid h-16 flex-1 place-items-center rounded-sm bg-bg-paper text-small shadow-pop">
              --shadow-pop
            </div>
            <div className="grid h-16 flex-1 place-items-center rounded-sm bg-bg-paper text-small shadow-drag">
              --shadow-drag
            </div>
          </div>
          <Note>
            Menü, açılır pencere, diyalog ve sürüklenen kart dışında koç ekranlarında gölge yok.
          </Note>
        </div>
      </div>
    </Section>
  );
}

export function RadiusSection() {
  return (
    <Section
      number="3"
      title="Köşe yuvarlaklığı ve boşluk"
      note="Yarıçap hiyerarşiktir: öğe büyüdükçe yuvarlaklık artar."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-card clay-sm p-5">
          <div className="flex flex-wrap items-end gap-3.5">
            {radii.map((r, i) => (
              <div key={r.token} className="text-center">
                <div
                  className={cn(
                    "w-22 border border-line bg-bg-surface shadow-[var(--clay-inner)]",
                    r.cls,
                  )}
                  style={{ height: 44 + i * 8 }}
                />
                <div className="mt-2 text-micro-lg font-medium">{r.label}</div>
                <Token>{r.token}</Token>
              </div>
            ))}
          </div>
          <Note>
            Çip ve rozet <strong>pill</strong>, düğme ve giriş <strong>sm–md</strong>, kart{" "}
            <strong>card</strong>, panel ve diyalog <strong>lg–xl</strong>. Konu haritası hücresi{" "}
            <strong>xs</strong>. Koç tarafı aynı ölçeği küçük uçtan kullanır: kart sm–md, düğme ve
            giriş xs–sm.
          </Note>
        </div>
        <div className="rounded-card clay-sm p-5">
          <h4 className="mb-3.5 text-small font-semibold">
            Boşluk ölçeği · 4 px tabanlı (Tailwind varsayılanı)
          </h4>
          <div className="flex flex-col gap-2">
            {spacing.map((s) => (
              <div key={s.cls} className="flex items-center gap-3">
                <span className="w-16 font-mono text-micro text-ink-500">p-{s.tw}</span>
                <span className={cn("h-3.5 rounded-[4px] bg-bg-sunken", s.cls)} />
                <span className="text-micro-lg text-ink-700">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function TypographySection() {
  return (
    <Section
      number="4"
      title="Tipografi"
      note="Lexend · 300–700 · tüm sayılarda tabular rakam · Türkçe karakter seti tam"
    >
      <div className="rounded-card clay-sm p-6">
        <div className="hidden grid-cols-[150px_120px_1fr] items-baseline gap-x-5 gap-y-3 border-b border-line pb-3 text-micro-lg text-ink-500 md:grid">
          <span>Ölçek</span>
          <span>Telefon / masaüstü</span>
          <span>Örnek</span>
        </div>
        {typeScale.map((t) => (
          <div
            key={t.token}
            className="grid items-baseline gap-x-5 gap-y-1.5 border-b border-line py-3.5 md:grid-cols-[150px_120px_1fr] md:gap-y-3"
          >
            <Token>{t.token}</Token>
            <span className="text-micro-lg text-ink-500">{t.sizes}</span>
            <span className={cn("leading-tight break-words", t.cls)}>{t.sample}</span>
          </div>
        ))}
        <p className="mt-4 max-w-prose text-small leading-relaxed text-ink-700">
          Telefonda gövde metni 16 px&apos;in altına inmez; 12–13 px yalnızca çip, birim ve tablo
          etiketlerinde. Başlıklar cümle düzeninde; büyük harfli etiket yok. Rakam yoğun alanlarda{" "}
          <span className="font-semibold">
            {formatNet(71.333)} net · {formatCount(1250)} soru · {formatPercent(80)} ·{" "}
            {formatSigned(-4.333)} · {formatSigned(3.67)}
          </span>{" "}
          hizalı kalır (<code>lib/format</code>; eksi işareti U+2212).
        </p>
      </div>
    </Section>
  );
}

export function BreakpointsSection() {
  return (
    <Section number="5" title="Kırılma noktaları ve responsive davranış">
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        {[
          { name: "Telefon", range: "< 768 px", w: "w-[30%]" },
          { name: "Tablet", range: "768 – 1023 px · md:", w: "w-[60%]" },
          { name: "Masaüstü", range: "≥ 1024 px · lg: · içerik en fazla 1320 px", w: "w-full" },
        ].map((b) => (
          <div key={b.name} className="rounded-card clay-sm p-5">
            <div className="text-small font-semibold">{b.name}</div>
            <div className="mt-1.5">
              <Token>{b.range}</Token>
            </div>
            <div className={cn("mt-3.5 h-1.5 rounded-pill bg-ink-900", b.w)} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        <div className="rounded-card clay-sm p-5">
          <h4 className="mb-2 text-body font-semibold">Öğrenci</h4>
          <p className="text-small leading-relaxed text-ink-700">
            Telefonda alt menü, tek sütun, hızlı kayıt alttan açılan panel. Tablette alt menü kalır,
            içerik iki sütun. Masaüstünde solda 104 px clay yan menü, hızlı kayıt ortada diyalog.
          </p>
        </div>
        <div className="rounded-card clay-sm p-5">
          <h4 className="mb-2 text-body font-semibold">Veli</h4>
          <p className="text-small leading-relaxed text-ink-700">
            Telefon öncelikli tek sütun. Masaüstünde aynı içerik ortalanır, en fazla iki sütun.
            Oyunsu öğe yok, sadece clay-sm özet kartları.
          </p>
        </div>
        <div className="rounded-sm border border-line-strong bg-bg-paper p-5">
          <h4 className="mb-2 text-body font-semibold">Koç</h4>
          <p className="text-small leading-relaxed text-ink-700">
            Masaüstü öncelikli. Telefonda yan menü hamburger menüye, tablo satırları kart listesine
            döner. Plan oluşturucu telefonda salt okunurdur.
          </p>
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xs bg-warning-soft px-3 py-2.5 text-small">
            <MonitorIcon className="size-4 text-warning" aria-hidden="true" />
            Düzenlemek için bilgisayardan açın
          </div>
        </div>
      </div>
    </Section>
  );
}
