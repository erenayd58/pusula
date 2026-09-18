import type * as React from "react";
import { type ShellNavItem } from "@/components/layout/bottom-nav";
import { NavLink } from "@/components/layout/nav-link";

/**
 * Öğrenci masaüstü yan menüsü (04 Bölüm 8.2): solda 104 px dar clay ray, ikon + küçük etiket.
 * `top` en üstte koyu hızlı kayıt düğmesi, `bottom` çıkış. Yalnızca `lg:` görünür.
 */
export function StudentRail({
  items,
  top,
  bottom,
}: {
  items: ShellNavItem[];
  top?: React.ReactNode;
  bottom?: React.ReactNode;
}) {
  return (
    <aside
      data-print="hide"
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--nav-rail)] p-3 lg:block"
    >
      <div className="flex h-full flex-col items-center gap-3 rounded-xl clay-lg px-2 py-4">
        {top}
        <nav aria-label="Ana menü" className="flex w-full flex-1 flex-col gap-1 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="flex min-h-14 clay-press flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-micro font-medium text-ink-500"
                    activeClassName="clay-pressed text-ink-900"
                  >
                    <Icon aria-hidden="true" className="size-5" />
                    <span className="text-center leading-tight">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        {bottom}
      </div>
    </aside>
  );
}
