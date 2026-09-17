import { NavLink } from "@/components/layout/nav-link";

export type TabItem = { href: string; label: string; exact?: boolean };

/**
 * Sayfa içi sekmeler (koç öğrenci detayı, K2): alt çizgili, telefonda yatay kaydırılır.
 * Öğeler registry'den gelir; kök sekme `exact` ile yalnızca kendi yolunda aktiftir.
 */
export function TabNav({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              exact={item.exact}
              className="-mb-px flex min-h-10 items-center border-b-2 border-transparent px-3 text-small font-medium text-ink-500 hover:text-ink-900 pointer-coarse:min-h-11"
              activeClassName="border-ink-900 text-ink-900"
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
