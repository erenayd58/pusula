import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { NavLink } from "@/components/layout/nav-link";
import { cn } from "@/lib/utils";

export type ShellNavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Telefon ve tablet alt menüsü (04 Bölüm 8.2, 8.3): clay-lg kap, 44 px dokunma hedefi,
 * ikon + etiket. `center` verilirse ortada çubuktan taşan (+) düğmesi yer alır (öğrenci);
 * veli menüsünde yok. Masaüstünde (`lg:`) gizlenir; sayfa içeriği ve yapışkan alt öğeler
 * `--nav-bottom` token'ı (çubuk + taşan düğme + safe-area) kadar boşluk bırakır.
 * Sunucu bileşenidir; aktiflik `NavLink` içinde hesaplanır.
 */
export function BottomNav({
  items,
  center,
  label,
  className,
}: {
  items: ShellNavItem[];
  center?: React.ReactNode;
  label: string;
  className?: string;
}) {
  const half = Math.ceil(items.length / 2);
  const left = center ? items.slice(0, half) : items;
  const right = center ? items.slice(half) : [];

  return (
    <nav
      data-print="hide"
      aria-label={label}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden",
        className,
      )}
    >
      <ul className="flex w-full max-w-md items-end justify-around gap-1 rounded-lg clay-lg px-2 py-2">
        {left.map((item) => (
          <BottomNavItem key={item.href} item={item} />
        ))}
        {center ? (
          <li className="-mt-[18px] flex flex-1 justify-center self-start">{center}</li>
        ) : null}
        {right.map((item) => (
          <BottomNavItem key={item.href} item={item} />
        ))}
      </ul>
    </nav>
  );
}

function BottomNavItem({ item }: { item: ShellNavItem }) {
  const Icon = item.icon;
  return (
    <li className="flex flex-1 justify-center">
      <NavLink
        href={item.href}
        className="flex min-h-11 min-w-11 clay-press flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-micro font-medium text-ink-500"
        activeClassName="clay-pressed text-ink-900"
      >
        <Icon aria-hidden="true" className="size-5" />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}
