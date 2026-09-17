import type * as React from "react";
import { CompassIcon } from "lucide-react";
import type { ShellNavItem } from "@/components/layout/bottom-nav";
import { CoachMobileMenu } from "@/components/layout/coach-mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { siteConfig } from "@/config/site";

/**
 * Koç kabuğu menüsü (04 Bölüm 8.4, flat): masaüstünde solda 232 px sabit yan menü, 1 px kenarlık,
 * gölge yok; clay yalnızca logo kutusunda. Telefonda üst bar + hamburger → soldan panel.
 * Sunucu bileşenidir; panelin açık/kapalı durumu `CoachMobileMenu` içinde.
 */
export function CoachSidebar({
  items,
  user,
  footer,
}: {
  items: ShellNavItem[];
  user: { fullName: string; subtitle: string };
  footer?: React.ReactNode;
}) {
  const nav = <CoachNav items={items} />;
  const brand = <Brand />;
  const account = <Account user={user} footer={footer} />;

  return (
    <>
      <aside
        data-print="hide"
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--coach-sidebar)] flex-col gap-6 border-r border-line bg-bg-paper px-3 py-4 lg:flex"
      >
        {brand}
        {nav}
        {account}
      </aside>
      <header
        data-print="hide"
        className="flex items-center justify-between gap-3 border-b border-line bg-bg-paper px-3 py-2 lg:hidden"
      >
        <CoachMobileMenu>
          {brand}
          {nav}
          {account}
        </CoachMobileMenu>
        <div className="flex-1">{brand}</div>
        {footer}
      </header>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-sm clay-sm text-ink-900"
      >
        <CompassIcon className="size-5" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-body font-semibold text-ink-900">{siteConfig.name}</span>
        <span className="text-micro text-ink-500">Koç paneli</span>
      </div>
    </div>
  );
}

function CoachNav({ items }: { items: ShellNavItem[] }) {
  return (
    <nav aria-label="Ana menü" className="flex-1">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <NavLink
                href={item.href}
                className="flex min-h-10 items-center gap-3 rounded-xs px-3 text-small font-medium text-ink-700 hover:bg-bg-surface pointer-coarse:min-h-11"
                activeClassName="bg-bg-surface text-ink-900"
              >
                <Icon aria-hidden="true" className="size-4" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Account({
  user,
  footer,
}: {
  user: { fullName: string; subtitle: string };
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-line px-1 pt-4">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-bg-surface text-micro-lg font-semibold text-ink-900"
      >
        {initials(user.fullName)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-small font-medium text-ink-900">{user.fullName}</span>
        <span className="truncate text-micro text-ink-500">{user.subtitle}</span>
      </div>
      <div className="hidden lg:block">{footer}</div>
    </div>
  );
}

/** Ad soyaddan iki harf (`Murat Kaya` → `MK`). */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}
